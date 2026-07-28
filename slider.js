(() => {
	const VISIBLE_CARDS = 1.5;
	const SWIPE_THRESHOLD = 40;

	function getGap(track) {
		const styles = window.getComputedStyle(track);
		return Number.parseFloat(styles.columnGap || styles.gap) || 0;
	}

	function createSlider(track) {
		const section = track.closest('.development-testimonial_l1') || track.parentElement;
		const viewport = track.parentElement;
		const previousButton = section?.querySelector('[slider-nav="back"]');
		const nextButton = section?.querySelector('[slider-nav]:not([slider-nav="back"])');
		let currentIndex = 0;
		let touchStartX = 0;

		if (!viewport) {
			return;
		}

		viewport.style.overflow = 'hidden';
		viewport.style.minWidth = '0';
		track.style.gap = track.style.gap || '1rem';
		track.style.minWidth = '0';
		track.style.width = '100%';
		track.style.transition = 'transform 400ms cubic-bezier(0.23, 1, 0.32, 1)';
		track.style.willChange = 'transform';
		previousButton?.removeAttribute('disabled');
		nextButton?.removeAttribute('disabled');

		function getCards() {
			return Array.from(track.children);
		}

		function update() {
			const cards = getCards();

			if (cards.length === 0 || viewport.clientWidth === 0) {
				return;
			}

			currentIndex = Math.min(currentIndex, cards.length - 1);
			const gap = getGap(track);
			const cardWidth = (viewport.clientWidth - gap * (VISIBLE_CARDS - 1)) / VISIBLE_CARDS;
			const step = cardWidth + gap;

			cards.forEach((card) => {
				card.style.boxSizing = 'border-box';
				card.style.width = `${cardWidth}px`;
				card.style.minWidth = `${cardWidth}px`;
				card.style.maxWidth = `${cardWidth}px`;
				card.style.flex = '0 0 auto';
			});

			track.style.transform = `translateX(${-currentIndex * step}px)`;

			if (previousButton) {
				previousButton.disabled = false;
				previousButton.setAttribute('aria-disabled', 'false');
			}

			if (nextButton) {
				nextButton.disabled = false;
				nextButton.setAttribute('aria-disabled', 'false');
			}
		}

		function goTo(index) {
			const cards = getCards();
			currentIndex = Math.max(0, Math.min(index, cards.length - 1));
			update();
		}

		previousButton?.addEventListener('click', () => goTo(currentIndex - 1));
		nextButton?.addEventListener('click', () => goTo(currentIndex + 1));

		viewport.addEventListener('touchstart', (event) => {
			touchStartX = event.changedTouches[0].clientX;
		}, { passive: true });

		viewport.addEventListener('touchend', (event) => {
			const swipeDistance = event.changedTouches[0].clientX - touchStartX;

			if (Math.abs(swipeDistance) >= SWIPE_THRESHOLD) {
				goTo(currentIndex + (swipeDistance < 0 ? 1 : -1));
			}
		}, { passive: true });

		window.addEventListener('resize', update);
		new MutationObserver(update).observe(track, { childList: true });
		new ResizeObserver(update).observe(viewport);
		update();
	}

	function initializeSliders() {
		document.querySelectorAll('[slider="holder"]').forEach(createSlider);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializeSliders, { once: true });
	} else {
		initializeSliders();
	}
})();
