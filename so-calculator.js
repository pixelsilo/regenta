// Shared Ownership monthly cost calculator.
// Runs on every element with calc="shared-ownership"; each instance is scoped to its own wrapper,
// so several calculators (of this or other types) can sit on the same page.
(() => {
	const ROOT_SELECTOR = '[calc="shared-ownership"]';
	let instanceCount = 0;
	const instances = [];
	const DISCLAIMER = 'Illustrative estimate only. It is not a mortgage offer, financial advice or confirmation of affordability. Actual rates, rent, service charges and eligibility vary by home, lender and personal circumstances; speak to a qualified mortgage adviser before committing.';

	const DEFAULTS = {
		value: 400000,
		term: 30,
		deposit: 5,
		share: 25,
		rate: 5.75,
		service: null,
	};
	// Standard rent on the unsold share. Schemes can differ, so buyers can change it in the
	// calc-input="rent" field; a calc-rent-rate attribute on the root changes the default for that instance.
	const DEFAULT_RENT_RATE = 2.75;
	const MAX_RENT_RATE = 10;

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
		const { value, term, deposit, share, rate, service, rentRate } = inputs;
		return (
			value > 0 &&
			term > 0 && term <= 40 &&
			deposit >= 0 && deposit <= 100 &&
			share > 0 && share <= 100 &&
			rate >= 0 && rate <= 25 &&
			rentRate >= 0 && rentRate <= MAX_RENT_RATE &&
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
		rent: { suffix: '%' },
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

		const defaultRentRate = parseNumber(root.getAttribute('calc-rent-rate')) ?? DEFAULT_RENT_RATE;
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
			let rentField = null;
			fields.forEach((field) => {
				const key = field.getAttribute('calc-input');
				if (key in inputs) {
					inputs[key] = parseNumber(field.value);
				} else if (key === 'rent') {
					rentField = parseNumber(field.value);
				}
			});
			inputs.rentRate = rentField ?? defaultRentRate;
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
			setOutput('rent-rate', Number.isFinite(inputs.rentRate) ? `${plain.format(inputs.rentRate)}%` : '–');

			if (!valid) {
				['share-price', 'deposit', 'mortgage', 'monthly-mortgage', 'monthly-rent', 'monthly-service', 'total'].forEach((name) => setOutput(name, '–'));
				return;
			}

			const result = calculate(inputs);
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
			} else if (!field.value && key === 'rent') {
				field.value = defaultRentRate;
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

		// Lets the WebMCP tool show the agent's figures in this calculator, so the page matches what the agent reports.
		instances.push({
			fill(values) {
				fields.forEach((field) => {
					const key = field.getAttribute('calc-input');
					if (!(key in values)) {
						return;
					}
					const value = values[key];
					field.value = value === null ? '' : (key === 'value' || key === 'service') ? plain.format(value) : value;
				});
				update();
			},
		});

		// Stop Enter from submitting any wrapping Webflow form.
		root.querySelectorAll('form').forEach((form) => {
			form.addEventListener('submit', (event) => event.preventDefault());
		});

		update();
	}

	// WebMCP (https://developer.chrome.com/docs/ai/webmcp): exposes the calculator as a tool that AI agents in the
	// browser can call. Feature-detected, so browsers without WebMCP are unaffected. Registered once per page.
	let webMcpRegistered = false;

	function toolNumber(raw, name, { min, max, fallback = null, optional = false }) {
		if (raw === undefined || raw === null || raw === '') {
			if (optional || fallback !== null) {
				return fallback;
			}
			throw new Error(`${name} is required.`);
		}
		const number = typeof raw === 'number' ? raw : parseNumber(raw);
		if (!Number.isFinite(number) || number < min || number > max) {
			throw new Error(`${name} must be a number between ${min} and ${max} (received ${JSON.stringify(raw)}).`);
		}
		return number;
	}

	const round2 = (n) => Math.round(n * 100) / 100;

	function registerWebMcp() {
		const modelContext = document.modelContext;
		if (webMcpRegistered || !instances.length || typeof modelContext?.registerTool !== 'function') {
			return;
		}
		webMcpRegistered = true;
		Promise.resolve(modelContext.registerTool({
			name: 'estimate_shared_ownership_monthly_costs',
			description: "Estimates the monthly cost of buying a Shared Ownership home in England using Regenta's calculator: share price, deposit, mortgage amount, monthly mortgage repayment (repayment mortgage), monthly rent on the share the buyer does not own, optional service charge and the total. Use it when someone asks what a Shared Ownership home would cost per month. The calculator on the page updates to show the same figures.",
			inputSchema: {
				type: 'object',
				properties: {
					market_value: { type: 'number', description: 'Full market value of the home in pounds, e.g. 400000.' },
					share_percent: { type: 'number', description: 'Percentage share being bought. Usually 25 to 75. Defaults to 25.' },
					deposit_percent: { type: 'number', description: 'Deposit as a percentage of the share price. Defaults to 5.' },
					interest_rate_percent: { type: 'number', description: 'Annual mortgage interest rate. Defaults to 5.75, an assumed average rate.' },
					mortgage_term_years: { type: 'number', description: 'Mortgage term in years. Defaults to 30.' },
					rent_rate_percent: { type: 'number', description: "Annual rent as a percentage of the share not owned. Defaults to 2.75, the standard rate; some schemes are lower, so use the scheme's own rate if known." },
					monthly_service_charge: { type: 'number', description: 'Monthly service charge in pounds, if known. Leave out to exclude it.' },
				},
				required: ['market_value'],
			},
			annotations: { readOnlyHint: true },
			execute: async (args = {}) => {
				const inputs = {
					value: toolNumber(args.market_value, 'market_value', { min: 1000, max: 100000000 }),
					share: toolNumber(args.share_percent, 'share_percent', { min: 1, max: 100, fallback: DEFAULTS.share }),
					deposit: toolNumber(args.deposit_percent, 'deposit_percent', { min: 0, max: 100, fallback: DEFAULTS.deposit }),
					rate: toolNumber(args.interest_rate_percent, 'interest_rate_percent', { min: 0, max: 25, fallback: DEFAULTS.rate }),
					term: toolNumber(args.mortgage_term_years, 'mortgage_term_years', { min: 1, max: 40, fallback: DEFAULTS.term }),
					rentRate: toolNumber(args.rent_rate_percent, 'rent_rate_percent', { min: 0, max: MAX_RENT_RATE, fallback: DEFAULT_RENT_RATE }),
					service: toolNumber(args.monthly_service_charge, 'monthly_service_charge', { min: 0, max: 10000, optional: true }),
				};
				const result = calculate(inputs);
				instances[0].fill({ value: inputs.value, share: inputs.share, deposit: inputs.deposit, rate: inputs.rate, term: inputs.term, rent: inputs.rentRate, service: inputs.service });
				return JSON.stringify({
					inputs: { market_value: inputs.value, share_percent: inputs.share, deposit_percent: inputs.deposit, interest_rate_percent: inputs.rate, mortgage_term_years: inputs.term, rent_rate_percent: inputs.rentRate, monthly_service_charge: inputs.service },
					share_price: round2(result.sharePrice),
					deposit: round2(result.depositAmount),
					mortgage_amount: round2(result.mortgageAmount),
					monthly_mortgage_repayment: round2(result.monthlyMortgage),
					monthly_rent: round2(result.monthlyRent),
					monthly_service_charge: inputs.service === null ? 'not included' : round2(result.monthlyService),
					estimated_total_monthly_cost: round2(result.totalMonthly),
					currency: 'GBP',
					disclaimer: DISCLAIMER,
				});
			},
		})).catch((error) => {
			webMcpRegistered = false;
			console.warn('[shared-ownership-calculator] WebMCP tool not registered:', error);
		});
	}

	function initializeCalculators() {
		injectStyles();
		document.querySelectorAll(ROOT_SELECTOR).forEach(createCalculator);
		registerWebMcp();
	}

	window.SharedOwnershipCalculator = { calculate, monthlyRepayment, parseNumber, init: initializeCalculators };

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializeCalculators, { once: true });
	} else {
		initializeCalculators();
	}
})();
