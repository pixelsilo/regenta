// Stamp Duty Land Tax (SDLT) calculator – England & Northern Ireland, residential rates from 1 April 2025.
// Runs on every element with calc="stamp-duty"; each instance is scoped to its own wrapper,
// so several calculators (of this or other types) can sit on the same page.
(() => {
	const ROOT_SELECTOR = '[calc="stamp-duty"]';
	let instanceCount = 0;

	// Each band: [upper limit of the band, rate %]. Bands run from the previous limit to this one.
	const STANDARD_BANDS = [
		[125000, 0],
		[250000, 2],
		[925000, 5],
		[1500000, 10],
		[Infinity, 12],
	];
	const ADDITIONAL_SURCHARGE = 5;
	const ADDITIONAL_MIN_PRICE = 40000; // Additional properties under £40,000 pay no SDLT.
	const FIRST_TIME_BANDS = [
		[300000, 0],
		[500000, 5],
	];
	const FIRST_TIME_MAX_PRICE = 500000; // Above this, first-time buyer relief is lost entirely.

	const DEFAULT_PRICE = 400000;
	const DEFAULT_BUYER = 'moving';
	const DEFAULT_STALE_TEXT = 'Re-calculate';
	const STALE_CLASS = 'is-stale';
	const SELECTED_CLASS = 'is-selected';

	const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
	const plain = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });
	const shortMoney = (n) => (n >= 1000000 ? `£${plain.format(n / 1000000)}m` : currency.format(n));

	function parseNumber(raw) {
		const cleaned = String(raw ?? '').replace(/[£,\s]/g, '');
		if (cleaned === '') {
			return null;
		}
		const number = Number(cleaned);
		return Number.isFinite(number) ? number : NaN;
	}

	function bandsFor(price, buyer) {
		if (buyer === 'first-time' && price <= FIRST_TIME_MAX_PRICE) {
			return { bands: FIRST_TIME_BANDS, reliefApplied: true };
		}
		if (buyer === 'additional') {
			if (price < ADDITIONAL_MIN_PRICE) {
				return { bands: [[Infinity, 0]], belowAdditionalMinimum: true };
			}
			return { bands: STANDARD_BANDS.map(([limit, rate]) => [limit, rate + ADDITIONAL_SURCHARGE]) };
		}
		return { bands: STANDARD_BANDS, reliefLost: buyer === 'first-time' };
	}

	function calculate(price, buyer) {
		const { bands, ...flags } = bandsFor(price, buyer);
		let lower = 0;
		const breakdown = [];

		for (const [upper, rate] of bands) {
			if (price <= lower) {
				break;
			}
			const taxable = Math.min(price, upper) - lower;
			breakdown.push({ lower, upper, rate, taxable, tax: (taxable * rate) / 100 });
			lower = upper;
		}

		// HMRC rounds SDLT down to the whole pound.
		const total = Math.floor(breakdown.reduce((sum, band) => sum + band.tax, 0));
		return { total, breakdown, effectiveRate: price > 0 ? (total / price) * 100 : 0, ...flags };
	}

	function bandLabel({ lower, upper, rate }) {
		const range = upper === Infinity
			? `Over ${shortMoney(lower)}`
			: lower === 0 ? `Up to ${shortMoney(upper)}` : `${shortMoney(lower)} – ${shortMoney(upper)}`;
		return `${range} at ${plain.format(rate)}%`;
	}

	function buyerNote(price, buyer) {
		if (buyer === 'first-time') {
			return Number.isFinite(price) && price > FIRST_TIME_MAX_PRICE
				? 'First-time buyer relief isn’t available on homes over £500,000, so standard rates apply to the whole price.'
				: 'First-time buyers pay no Stamp Duty up to £300,000, then 5% on the portion up to £500,000.';
		}
		if (buyer === 'additional') {
			return Number.isFinite(price) && price > 0 && price < ADDITIONAL_MIN_PRICE
				? 'Additional properties under £40,000 don’t pay Stamp Duty.'
				: 'Includes the 5% surcharge on additional properties, such as second homes and buy-to-lets.';
		}
		return 'Standard rates apply when you’re buying a home to replace your main residence.';
	}

	function injectStyles() {
		if (document.getElementById('sd-calc-styles')) {
			return;
		}
		const style = document.createElement('style');
		style.id = 'sd-calc-styles';
		style.textContent = `
			.calc_affix-wrap { position: relative; display: block; width: 100%; }
			.calc_affix { position: absolute; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: 0.6; line-height: 1; white-space: nowrap; }
			.calc_affix-prefix { left: 1rem; }
			/* Webflow's focus-within ring on the pills should only show for keyboard users, not after a click. */
			[calc="stamp-duty"] .calc_option:focus-within:not(:has(:focus-visible)) { outline: none; }
		`;
		document.head.appendChild(style);
	}

	// £ shown inside the price field.
	function addPrefix(field, text) {
		const wrap = document.createElement('span');
		wrap.className = 'calc_affix-wrap';
		field.parentNode.insertBefore(wrap, field);
		wrap.appendChild(field);

		const fieldStyles = window.getComputedStyle(field);
		const basePaddingLeft = fieldStyles.paddingLeft;
		const affix = document.createElement('span');
		affix.className = 'calc_affix calc_affix-prefix';
		affix.textContent = text;
		affix.setAttribute('aria-hidden', 'true');
		affix.style.fontFamily = fieldStyles.fontFamily;
		affix.style.fontSize = fieldStyles.fontSize;
		affix.style.color = fieldStyles.color;
		wrap.appendChild(affix);

		const pad = () => {
			field.style.paddingLeft = `calc(${basePaddingLeft} + ${affix.offsetWidth}px + 0.35rem)`;
		};
		pad();
		document.fonts?.ready.then(pad);
	}

	// Webflow IDs and radio names are fixed per element, so a second copy would clash with the first.
	function uniquify(root, instance) {
		root.querySelectorAll('[id]').forEach((el) => {
			const oldId = el.id;
			const newId = `${oldId}-${instance}`;
			root.querySelectorAll(`label[for="${oldId}"]`).forEach((label) => {
				label.htmlFor = newId;
			});
			['aria-labelledby', 'aria-describedby'].forEach((attr) => {
				root.querySelectorAll(`[${attr}="${oldId}"]`).forEach((ref) => ref.setAttribute(attr, newId));
			});
			el.id = newId;
		});
		root.querySelectorAll('input[type="radio"][name]').forEach((radio) => {
			radio.name = `${radio.name}-${instance}`;
		});
	}

	function createCalculator(root) {
		if (root.hasAttribute('calc-ready')) {
			return;
		}
		root.setAttribute('calc-ready', '');
		instanceCount += 1;
		uniquify(root, instanceCount);

		const priceField = root.querySelector('[calc-input="price"]');
		const radios = Array.from(root.querySelectorAll('input[type="radio"][calc-input="buyer"]'));
		const breakdownEl = root.querySelector('[calc-breakdown]');
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

		if (!priceField) {
			return;
		}
		if (!priceField.value) {
			priceField.value = plain.format(DEFAULT_PRICE);
		}
		if (!radios.some((radio) => radio.checked)) {
			const fallback = radios.find((radio) => radio.value === DEFAULT_BUYER) ?? radios[0];
			if (fallback) {
				fallback.checked = true;
			}
		}

		const selectedBuyer = () => radios.find((radio) => radio.checked)?.value ?? DEFAULT_BUYER;

		function setOutput(name, text) {
			root.querySelectorAll(`[calc-output="${name}"]`).forEach((el) => {
				el.textContent = text;
			});
		}

		function syncOptions() {
			radios.forEach((radio) => {
				radio.closest('label')?.classList.toggle(SELECTED_CLASS, radio.checked);
			});
			setOutput('buyer-note', buyerNote(parseNumber(priceField.value), selectedBuyer()));
		}

		// Results only refresh when the user presses Calculate (or Enter). Until then the results are dimmed
		// and the button switches to "Re-calculate" with the is-stale class (styled in Webflow).
		function setStale(stale) {
			root.toggleAttribute('calc-stale-state', stale);
			root.querySelectorAll('[calc-output="total"], [calc-output="effective-rate"], [calc-breakdown]').forEach((el) => {
				el.style.opacity = stale ? '0.4' : '';
				el.style.transition = 'opacity 200ms ease';
			});
			buttons.forEach(({ button, label, readyText, staleText }) => {
				button.classList.toggle(STALE_CLASS, stale);
				label.textContent = stale ? staleText : readyText;
			});
		}

		function renderBreakdown(breakdown) {
			if (!breakdownEl) {
				return;
			}
			breakdownEl.replaceChildren(...breakdown.map((band) => {
				const row = document.createElement('div');
				row.className = 'calc_result-row';
				const label = document.createElement('div');
				label.className = 'calc_result-label';
				label.textContent = bandLabel(band);
				const value = document.createElement('div');
				value.className = 'calc_result-value';
				value.textContent = currency.format(Math.floor(band.tax));
				row.append(label, value);
				return row;
			}));
		}

		function update() {
			const price = parseNumber(priceField.value);
			const valid = Number.isFinite(price) && price > 0;
			root.toggleAttribute('calc-invalid', !valid);
			root.querySelectorAll('[calc-error]').forEach((el) => {
				el.style.display = valid ? 'none' : 'block';
			});
			setStale(false);
			syncOptions();

			if (!valid) {
				renderBreakdown([]);
				setOutput('total', '–');
				setOutput('effective-rate', '');
				return;
			}

			const result = calculate(price, selectedBuyer());
			renderBreakdown(result.breakdown);
			setOutput('total', currency.format(result.total));
			setOutput('effective-rate', `Effective rate: ${plain.format(Math.round(result.effectiveRate * 100) / 100)}% of the purchase price`);
		}

		addPrefix(priceField, '£');

		priceField.addEventListener('input', () => {
			setStale(true);
			syncOptions();
		});
		priceField.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				update();
			}
		});
		priceField.addEventListener('blur', () => {
			const number = parseNumber(priceField.value);
			if (Number.isFinite(number)) {
				priceField.value = plain.format(number);
			}
		});
		radios.forEach((radio) => {
			radio.addEventListener('change', () => {
				syncOptions();
				setStale(true);
			});
		});
		buttons.forEach(({ button }) => {
			button.addEventListener('click', (event) => {
				event.preventDefault();
				update();
			});
		});

		update();
	}

	function initializeCalculators() {
		injectStyles();
		document.querySelectorAll(ROOT_SELECTOR).forEach(createCalculator);
	}

	window.StampDutyCalculator = { calculate, parseNumber, init: initializeCalculators };

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializeCalculators, { once: true });
	} else {
		initializeCalculators();
	}
})();
