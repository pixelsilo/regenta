// Shared Ownership monthly cost calculator.
// Runs on every element with calc="shared-ownership"; each instance is scoped to its own wrapper,
// so several calculators (of this or other types) can sit on the same page.
(() => {
	const ROOT_SELECTOR = '[calc="shared-ownership"]';
	let instanceCount = 0;

	const DEFAULTS = {
		value: 400000,
		term: 30,
		deposit: 5,
		share: 25,
		rate: 5.75,
		service: null,
	};
	const DEFAULT_RENT_RATE = 2.75;

	const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
	const currencyPence = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
	const plain = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

	function parseNumber(raw) {
		const cleaned = String(raw ?? '').replace(/[£,%\s]/g, '');
		if (cleaned === '') {
			return null;
		}
		const number = Number(cleaned);
		return Number.isFinite(number) ? number : NaN;
	}

	function monthlyRepayment(principal, annualRatePct, years) {
		const months = years * 12;
		if (principal <= 0 || months <= 0) {
			return 0;
		}
		const monthlyRate = annualRatePct / 100 / 12;
		if (monthlyRate === 0) {
			return principal / months;
		}
		return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
	}

	function calculate({ value, term, deposit, share, rate, service, rentRate = DEFAULT_RENT_RATE }) {
		const sharePrice = value * (share / 100);
		const depositAmount = sharePrice * (deposit / 100);
		const mortgageAmount = sharePrice - depositAmount;
		const monthlyMortgage = monthlyRepayment(mortgageAmount, rate, term);
		const unsoldEquity = value - sharePrice;
		const monthlyRent = (unsoldEquity * (rentRate / 100)) / 12;
		const monthlyService = service ?? 0;

		return {
			sharePrice,
			depositAmount,
			mortgageAmount,
			monthlyMortgage,
			unsoldEquity,
			monthlyRent,
			monthlyService,
			totalMonthly: monthlyMortgage + monthlyRent + monthlyService,
		};
	}

	function isValid(inputs) {
		const { value, term, deposit, share, rate, service } = inputs;
		return (
			value > 0 &&
			term > 0 && term <= 40 &&
			deposit >= 0 && deposit <= 100 &&
			share > 0 && share <= 100 &&
			rate >= 0 && rate <= 25 &&
			(service === null || service >= 0)
		);
	}

	// £ / % / years shown inside each field. Override per input with calc-prefix / calc-suffix attributes.
	const AFFIXES = {
		value: { prefix: '£' },
		service: { prefix: '£' },
		share: { suffix: '%' },
		deposit: { suffix: '%' },
		rate: { suffix: '%' },
		term: { suffix: 'years' },
	};
	// Calculate button while figures are out of date. Override per button with calc-stale-text.
	const DEFAULT_STALE_TEXT = 'Re-calculate';
	const STALE_CLASS = 'is-stale';

	function injectStyles() {
		if (document.getElementById('so-calc-styles')) {
			return;
		}
		const style = document.createElement('style');
		style.id = 'so-calc-styles';
		style.textContent = `
			.calc_affix-wrap { position: relative; display: block; width: 100%; }
			.calc_affix { position: absolute; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: 0.6; line-height: 1; white-space: nowrap; }
			.calc_affix-prefix { left: 1rem; }
			.calc_affix-suffix { right: 1rem; }
			.calc_affix-placeholder { line-height: 1.3; }
			[calc-input]::-webkit-outer-spin-button, [calc-input]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
			[calc-input][type="number"] { -moz-appearance: textfield; appearance: textfield; }
		`;
		document.head.appendChild(style);
	}

	function addAffixes(field) {
		const key = field.getAttribute('calc-input');
		const prefix = field.getAttribute('calc-prefix') ?? AFFIXES[key]?.prefix;
		const suffix = field.getAttribute('calc-suffix') ?? AFFIXES[key]?.suffix;
		const placeholder = field.getAttribute('placeholder');
		if (!prefix && !suffix && !placeholder) {
			return;
		}

		const wrap = document.createElement('span');
		wrap.className = 'calc_affix-wrap';
		field.parentNode.insertBefore(wrap, field);
		wrap.appendChild(field);

		const fieldStyles = window.getComputedStyle(field);
		const basePaddingLeft = fieldStyles.paddingLeft;

		function makeAffix(text, side) {
			const affix = document.createElement('span');
			affix.className = `calc_affix calc_affix-${side}`;
			affix.textContent = text;
			affix.setAttribute('aria-hidden', 'true');
			affix.style.fontFamily = fieldStyles.fontFamily;
			affix.style.fontSize = fieldStyles.fontSize;
			affix.style.color = fieldStyles.color;
			wrap.appendChild(affix);
			return affix;
		}

		const prefixEl = prefix ? makeAffix(prefix, 'prefix') : null;
		const suffixEl = suffix ? makeAffix(suffix, 'suffix') : null;

		// The Area font's glyphs rise above its ascent metric, and browsers clip native placeholders
		// to that box (cutting off the tops of digits). Draw the placeholder ourselves instead.
		let placeholderEl = null;
		if (placeholder) {
			const placeholderColor = window.getComputedStyle(field, '::placeholder').color;
			placeholderEl = makeAffix(placeholder, 'placeholder');
			placeholderEl.style.color = placeholderColor;
			placeholderEl.style.opacity = '1';
			field.removeAttribute('placeholder');
			const togglePlaceholder = () => {
				placeholderEl.style.display = field.value ? 'none' : '';
			};
			field.addEventListener('input', togglePlaceholder);
			togglePlaceholder();
		}

		function pad() {
			if (prefixEl) {
				field.style.paddingLeft = `calc(${basePaddingLeft} + ${prefixEl.offsetWidth}px + 0.35rem)`;
			}
			if (suffixEl) {
				field.style.paddingRight = `calc(1rem + ${suffixEl.offsetWidth}px + 0.35rem)`;
			}
			if (placeholderEl) {
				placeholderEl.style.left = window.getComputedStyle(field).paddingLeft;
			}
		}

		pad();
		document.fonts?.ready.then(pad);
	}

	// Webflow IDs are fixed per element, so a second copy of the calculator would duplicate them.
	// Give each input a unique id and repoint its label so clicking a label focuses the right field.
	function uniquifyIds(root, fields, instance) {
		fields.forEach((field) => {
			const oldId = field.id || `so-calc-${field.getAttribute('calc-input')}`;
			const newId = `${oldId}-${instance}`;
			root.querySelectorAll(`label[for="${oldId}"]`).forEach((label) => {
				label.htmlFor = newId;
			});
			field.id = newId;
		});
		root.querySelectorAll('[aria-describedby]').forEach((el) => {
			const describedBy = el.getAttribute('aria-describedby');
			const target = root.querySelector(`[id="${describedBy}"]`);
			if (target) {
				target.id = `${describedBy}-${instance}`;
				el.setAttribute('aria-describedby', target.id);
			}
		});
	}

	function createCalculator(root) {
		if (root.hasAttribute('calc-ready')) {
			return;
		}
		root.setAttribute('calc-ready', '');
		instanceCount += 1;

		const rentRate = parseNumber(root.getAttribute('calc-rent-rate')) ?? DEFAULT_RENT_RATE;
		const fields = Array.from(root.querySelectorAll('[calc-input]'));
		uniquifyIds(root, fields, instanceCount);
		const buttons = Array.from(root.querySelectorAll('[calc-action="calculate"]')).map((button) => {
			// Webflow wraps the button text in a child element; swap that so the button's own markup stays intact.
			const label = button.firstElementChild ?? button;
			return {
				button,
				label,
				readyText: label.textContent.trim(),
				staleText: button.getAttribute('calc-stale-text') || DEFAULT_STALE_TEXT,
			};
		});

		function readInputs() {
			const inputs = { ...DEFAULTS };
			fields.forEach((field) => {
				const key = field.getAttribute('calc-input');
				if (key in inputs) {
					inputs[key] = parseNumber(field.value);
				}
			});
			// Only the service charge may be left blank; anything else blank falls back to its default.
			Object.keys(DEFAULTS).forEach((key) => {
				if (inputs[key] === null && key !== 'service') {
					inputs[key] = DEFAULTS[key];
				}
			});
			return inputs;
		}

		function setOutput(name, text) {
			root.querySelectorAll(`[calc-output="${name}"]`).forEach((el) => {
				el.textContent = text;
			});
		}

		function update() {
			const inputs = readInputs();
			const valid = isValid(inputs);
			root.toggleAttribute('calc-invalid', !valid);
			root.querySelectorAll('[calc-error]').forEach((el) => {
				el.style.display = valid ? 'none' : 'block';
			});
			setStale(false);

			setOutput('share-pct', `${plain.format(inputs.share)}%`);
			setOutput('deposit-pct', `${plain.format(inputs.deposit)}%`);
			setOutput('rate', `${plain.format(inputs.rate)}%`);
			setOutput('term', plain.format(inputs.term));
			setOutput('rent-rate', `${plain.format(rentRate)}%`);

			if (!valid) {
				['share-price', 'deposit', 'mortgage', 'monthly-mortgage', 'monthly-rent', 'monthly-service', 'total'].forEach((name) => setOutput(name, '–'));
				return;
			}

			const result = calculate({ ...inputs, rentRate });
			setOutput('share-price', currency.format(result.sharePrice));
			setOutput('deposit', currency.format(result.depositAmount));
			setOutput('mortgage', currency.format(result.mortgageAmount));
			setOutput('monthly-mortgage', currencyPence.format(result.monthlyMortgage));
			setOutput('monthly-rent', currencyPence.format(result.monthlyRent));
			setOutput('monthly-service', inputs.service === null ? 'Not included' : currencyPence.format(result.monthlyService));
			setOutput('total', currencyPence.format(result.totalMonthly));
		}

		// Results only refresh when the user presses Calculate (or Enter). Until then the results are dimmed
		// and the button switches to "Re-calculate" with the is-stale class (styled in Webflow).
		function setStale(stale) {
			root.toggleAttribute('calc-stale-state', stale);
			root.querySelectorAll('[calc-output]').forEach((el) => {
				el.style.opacity = stale ? '0.4' : '';
				el.style.transition = 'opacity 200ms ease';
			});
			buttons.forEach(({ button, label, readyText, staleText }) => {
				button.classList.toggle(STALE_CLASS, stale);
				label.textContent = stale ? staleText : readyText;
			});
		}

		buttons.forEach(({ button }) => {
			button.addEventListener('click', (event) => {
				event.preventDefault();
				update();
			});
		});

		fields.forEach((field) => {
			const key = field.getAttribute('calc-input');
			if (!field.value && key in DEFAULTS && DEFAULTS[key] !== null) {
				field.value = key === 'value' ? plain.format(DEFAULTS[key]) : DEFAULTS[key];
			}
			addAffixes(field);
			field.addEventListener('input', () => setStale(true));
			field.addEventListener('keydown', (event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					update();
				}
			});
			if (key === 'value' || key === 'service') {
				field.addEventListener('blur', () => {
					const number = parseNumber(field.value);
					if (Number.isFinite(number)) {
						field.value = plain.format(number);
					}
				});
			}
		});

		// Stop Enter from submitting any wrapping Webflow form.
		root.querySelectorAll('form').forEach((form) => {
			form.addEventListener('submit', (event) => event.preventDefault());
		});

		update();
	}

	function initializeCalculators() {
		injectStyles();
		document.querySelectorAll(ROOT_SELECTOR).forEach(createCalculator);
	}

	window.SharedOwnershipCalculator = { calculate, monthlyRepayment, parseNumber, init: initializeCalculators };

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializeCalculators, { once: true });
	} else {
		initializeCalculators();
	}
})();
