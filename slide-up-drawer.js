(function (window, document) {
  'use strict';

  // CSS variable names used for sizing
  const SIZE_VARS = ['--drawer-width', '--drawer-height', '--drawer-max-width', '--drawer-max-height'];

  // Default mobile breakpoint (992px = tablets and below)
  const DEFAULT_MOBILE_MQ = '(max-width: 991px)';

  class SlideUpDrawer {
    constructor() {
      this.isOpen = false;
      this.scrollY = 0;
      this.currentOptions = {};
      const brandColor = typeof getBrandColor === 'function' ? getBrandColor() : '#005dac';
      this.defaultColors = ['#000', brandColor];
      this.closedByResize = false;

      // Cache DOM elements
      this.elements = {
        backdrop: document.querySelector('[data-target="slideUpDrawerBackdrop"]'),
        drawer: document.querySelector('[data-target="slideUpDrawer"]'),
        closeBtn: document.querySelector('[data-target="slideUpDrawerClose"]'),
        body: document.querySelector('[data-target="slideUpDrawerBody"]'),
        prelayers: document.querySelector('[data-target="slideUpDrawerPrelayers"]')
      };

      // Shortcuts for frequently used elements
      this.drawer = this.elements.drawer;
      this.backdrop = this.elements.backdrop;

      // Validate required elements
      const required = ['backdrop', 'drawer', 'closeBtn', 'body'];
      const missing = required.filter(key => !this.elements[key]);
      if (missing.length) {
        return;
      }

      // Bind event handlers
      this.handleKeydown = this.handleKeydown.bind(this);
      this.handleResize = this.handleResize.bind(this);

      // Attach listeners - manual close resets resize tracking
      this.backdrop.addEventListener('click', () => this.manualClose());
      this.elements.closeBtn.addEventListener('click', () => this.manualClose());
      window.addEventListener('resize', this.handleResize);

      // Check for GSAP (falls back to CSS transitions if not available)
      this.hasGSAP = typeof gsap !== 'undefined';
    }

    open(options = {}) {
      if (this.isOpen || !this.backdrop) return;

      this.prevFocus = document.activeElement;
      const resolved = this.resolveResponsive(options);

      if (!this.isEnabled(resolved)) return;

      this.currentOptions = resolved;
      this.originalOptions = options; // Store for resize check

      // Set content
      this.elements.body.innerHTML = resolved.contentHtml || '';

      // Get current position based on viewport
      const currentPosition = this.getCurrentPosition();

      // Set position data attribute (used by CSS for positioning)
      this.updatePositionAttribute(currentPosition);

      // Apply caller's size config to the drawer only
      this.applySize(resolved.size);

      // Determine animation mode: 'gsap' (opt-in) or 'css' (default)
      const useGSAP = resolved.animation === 'gsap' && this.hasGSAP;

      // GSAP path: make drawer visible early so setupPrelayers can measure its rendered size
      if (useGSAP && resolved.animate !== false) {
        this.drawer.classList.add('slide-up-drawer--open');
        const colors = resolved.colors || this.defaultColors;
        this.setupPrelayers(colors, currentPosition);
      }

      // Update ARIA and show backdrop
      this.setAriaState(true);
      this.backdrop.classList.add('slide-up-drawer__backdrop--open');
      this.lockScroll();

      if (useGSAP) {
        this.animateOpen(currentPosition);
      } else {
        this.animateCSSOpen(currentPosition);
      }

      this.elements.closeBtn.focus();
      document.addEventListener('keydown', this.handleKeydown);
      this.isOpen = true;
    }

    close() {
      if (!this.isOpen) return;

      this.setAriaState(false);
      this.backdrop.classList.remove('slide-up-drawer__backdrop--open');

      // Get current position for correct close direction
      const currentPosition = this.getCurrentPosition();
      
      // Use same animation mode as open
      const resolved = this.resolveResponsive(this.originalOptions || this.currentOptions);
      const useGSAP = resolved.animation === 'gsap' && this.hasGSAP;

      if (useGSAP) {
        this.animateClose(currentPosition);
      } else {
        this.animateCSSClose(currentPosition);
      }

      document.removeEventListener('keydown', this.handleKeydown);
      this.unlockScroll();

      if (this.prevFocus?.focus) this.prevFocus.focus({ preventScroll: true });
      this.isOpen = false;

      // Fallback cleanup in case CSS transition doesn't fire (e.g., mobile checkout)
      setTimeout(() => {
        if (!this.isOpen) {
          this.backdrop.classList.remove('slide-up-drawer__backdrop--open');
          this.drawer.classList.remove('slide-up-drawer--open', 'slide-up-drawer--animating');
          this.drawer.style.transform = '';
          this.drawer.style.willChange = '';
          this.clearSize();
        }
      }, 400);
    }

    manualClose() {
      // User-initiated close (click, ESC) - reset resize tracking
      this.closedByResize = false;
      this.close();
    }

    // --- Position Management ---

    /**
     * Get the current position based on viewport and responsive config
     * This is the single source of truth for position
     */
    getCurrentPosition() {
      const options = this.originalOptions || this.currentOptions;
      const basePosition = options.position || 'bottom';
      
      if (!options.responsive?.length) return basePosition;

      // Find the LAST matching responsive config (specificity)
      let resolvedPosition = basePosition;
      for (const r of options.responsive) {
        if (r?.mq && r.position && window.matchMedia(r.mq).matches) {
          resolvedPosition = r.position;
        }
      }

      return resolvedPosition;
    }

    /**
     * Update data-position attribute on drawer and prelayers
     */
    updatePositionAttribute(position) {
      this.drawer.setAttribute('data-position', position);
      this.elements.prelayers?.setAttribute('data-position', position);
      // Remove mobile-specific attributes - we now use a single data-position that updates dynamically
      this.drawer.removeAttribute('data-position-mobile');
      this.elements.prelayers?.removeAttribute('data-position-mobile');
    }

    // --- ARIA state management ---

    setAriaState(isOpen) {
      this.drawer.setAttribute('aria-hidden', String(!isOpen));
      this.backdrop.setAttribute('aria-hidden', String(!isOpen));
      if (isOpen) {
        this.drawer.setAttribute('aria-modal', 'true');
      } else {
        this.drawer.removeAttribute('aria-modal');
      }
    }

    // --- Prelayers (color animation layers) ---

    setupPrelayers(colors, position) {
      const container = this.elements.prelayers;
      if (!container) return;

      // Clear existing and reset visibility
      container.innerHTML = '';
      container.style.visibility = 'visible';

      if (!colors?.length) return;

      // Create color layers (max 4, skip middle if 3+)
      let layerColors = colors.slice(0, 4);
      if (layerColors.length >= 3) {
        const mid = Math.floor(layerColors.length / 2);
        layerColors.splice(mid, 1);
      }

      layerColors.forEach(color => {
        const layer = document.createElement('div');
        layer.className = 'slide-up-drawer__prelayer';
        layer.style.background = color;
        layer.setAttribute('aria-hidden', 'true');
        container.appendChild(layer);
      });

      container.setAttribute('data-position', position);

      // Measure drawer's rendered size and apply concrete pixel values to prelayers.
      // The drawer is already visible (--open class added in open()), so offsetHeight/offsetWidth
      // reflect the actual content-driven size — even when the caller used 'fit-content' or 'auto'.
      const prop = (position === 'left' || position === 'right') ? '--drawer-width' : '--drawer-height';
      const measured = (position === 'left' || position === 'right') ? this.drawer.offsetWidth : this.drawer.offsetHeight;
      if (measured > 0) container.style.setProperty(prop, `${measured}px`);
    }

    cleanupPrelayers() {
      if (this.elements.prelayers) {
        this.elements.prelayers.innerHTML = '';
      }
    }

    getPrelayers() {
      return this.elements.prelayers
        ? Array.from(this.elements.prelayers.querySelectorAll('.slide-up-drawer__prelayer'))
        : [];
    }

    // --- CSS Animations (default) ---

    animateCSSOpen(position) {
      this.drawer.style.willChange = 'transform';

      this.drawer.style.transform = this.getCSSTransform(position, true);
      this.drawer.classList.add('slide-up-drawer--open');
      this.drawer.offsetHeight;
      this.drawer.classList.add('slide-up-drawer--animating');
      this.drawer.style.transform = 'translate3d(0, 0, 0)';

      const onTransitionEnd = () => {
        this.drawer.classList.remove('slide-up-drawer--animating');
        this.drawer.style.transform = '';
        this.drawer.style.willChange = '';
        this.drawer.removeEventListener('transitionend', onTransitionEnd);
      };

      this.drawer.addEventListener('transitionend', onTransitionEnd);
    }

    animateCSSClose(position) {
      this.cleanupPrelayers();
      this.drawer.style.willChange = 'transform';
      this.drawer.classList.add('slide-up-drawer--animating');
      this.drawer.offsetHeight;
      this.drawer.style.transform = this.getCSSTransform(position, true);

      const onTransitionEnd = () => {
        this.drawer.classList.remove('slide-up-drawer--open', 'slide-up-drawer--animating');
        this.drawer.style.transform = '';
        this.drawer.style.willChange = '';
        this.clearSize();
        this.drawer.removeEventListener('transitionend', onTransitionEnd);
      };

      this.drawer.addEventListener('transitionend', onTransitionEnd);
    }

    getCSSTransform(position, offscreen) {
      if (!offscreen) return 'translate3d(0, 0, 0)';
      const transforms = {
        right: 'translate3d(100%, 0, 0)',
        left: 'translate3d(-100%, 0, 0)',
        top: 'translate3d(0, -100%, 0)',
        bottom: 'translate3d(0, 100%, 0)'
      };
      return transforms[position] || transforms.bottom;
    }

    // --- GSAP Animations (opt-in via animation: 'gsap') ---

    animateOpen(position) {
      const layers = this.getPrelayers();
      const offscreen = this.getOffscreenTransform(position);

      this.drawer.classList.add('slide-up-drawer--open');
      this.drawer.style.willChange = 'transform';

      if (this.elements.prelayers) {
        this.elements.prelayers.style.willChange = 'transform, opacity';
        gsap.set(this.elements.prelayers, { opacity: 1, visibility: 'visible' });
      }

      gsap.set(this.drawer, offscreen);
      layers.forEach(layer => {
        layer.style.willChange = 'transform';
        gsap.set(layer, offscreen);
      });

      const tl = gsap.timeline({
        onComplete: () => {
          this.drawer.style.willChange = '';
          if (this.elements.prelayers) {
            this.elements.prelayers.style.willChange = '';
          }
          layers.forEach(layer => {
            layer.style.willChange = '';
          });
        }
      });

      layers.forEach((layer, i) => {
        tl.to(layer, {
          xPercent: 0,
          yPercent: 0,
          duration: 0.5,
          ease: 'power4.out'
        }, i * 0.07);
      });

      const drawerDelay = layers.length ? (layers.length - 1) * 0.07 + 0.08 : 0;

      tl.to(this.drawer, {
        xPercent: 0,
        yPercent: 0,
        duration: 0.65,
        ease: 'power4.out'
      }, drawerDelay);

      if (layers.length) {
        tl.to(this.elements.prelayers, {
          opacity: 0,
          duration: 0.25,
          ease: 'power2.out',
          onComplete: () => {
            if (this.elements.prelayers) {
              this.elements.prelayers.style.visibility = 'hidden';
            }
          }
        }, drawerDelay + 0.3);
      }
    }

    animateClose(position) {
      this.cleanupPrelayers();
      this.drawer.style.willChange = 'transform';

      gsap.to(this.drawer, {
        ...this.getOffscreenTransform(position),
        duration: 0.3,
        ease: 'power3.in',
        onComplete: () => {
          this.drawer.classList.remove('slide-up-drawer--open');
          gsap.set(this.drawer, { clearProps: 'transform,xPercent,yPercent' });
          this.drawer.style.willChange = '';
          this.clearSize();
        }
      });
    }

    getOffscreenTransform(position) {
      const transforms = {
        right: { xPercent: 100, yPercent: 0 },
        left: { xPercent: -100, yPercent: 0 },
        top: { xPercent: 0, yPercent: -100 },
        bottom: { xPercent: 0, yPercent: 100 }
      };
      return transforms[position] || transforms.bottom;
    }

    // --- Event Handlers ---

    handleKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.manualClose();
      }
    }

    handleResize() {
      const resolved = this.resolveResponsive(this.originalOptions || this.currentOptions);
      const isEnabled = this.isEnabled(resolved);

      if (this.isOpen && !isEnabled) {
        this.closedByResize = true;
        this.close();
      } else if (!this.isOpen && this.closedByResize && isEnabled) {
        this.closedByResize = false;
        this.open(this.originalOptions);
      } else if (this.isOpen && isEnabled) {
        const newPosition = this.getCurrentPosition();
        this.updatePositionAttribute(newPosition);
        this.applySize(resolved.size);
      }
    }

    // --- Utilities ---

    isEnabled(resolved) {
      if (typeof resolved.enabled === 'function') return !!resolved.enabled(resolved);
      if (typeof resolved.enabled === 'boolean') return resolved.enabled;
      return true;
    }

    /** Apply size config to the drawer. Prelayers get their size from setupPrelayers() via measurement. @param {Object} size */
    applySize(size = {}) {
      if (!size) return;
      const css = v => (typeof v === 'number' ? `${v}px` : v);
      if (size.width) this.drawer.style.setProperty('--drawer-width', css(size.width));
      if (size.height) this.drawer.style.setProperty('--drawer-height', css(size.height));
      if (size.maxWidth) this.drawer.style.setProperty('--drawer-max-width', css(size.maxWidth));
      if (size.maxHeight) this.drawer.style.setProperty('--drawer-max-height', css(size.maxHeight));
    }

    clearSize() {
      const targets = [this.drawer, this.elements.prelayers].filter(Boolean);
      targets.forEach(el => SIZE_VARS.forEach(prop => el.style.removeProperty(prop)));
    }

    resolveResponsive(options) {
      const resolved = { ...options };

      (options.responsive || []).forEach(r => {
        if (!r?.mq || !window.matchMedia(r.mq).matches) return;

        if (r.enabled !== undefined) resolved.enabled = r.enabled;
        if (r.position) resolved.position = r.position;
        if (r.size) resolved.size = { ...(resolved.size || {}), ...r.size };
        if (r.contentHtml) resolved.contentHtml = r.contentHtml;
        if (r.colors) resolved.colors = r.colors;
        if (r.animation) resolved.animation = r.animation;
        if (r.animate !== undefined) resolved.animate = r.animate;
      });

      return resolved;
    }

  lockScroll() {
    this.scrollY = window.scrollY || 0;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.documentElement.classList.add('slide-up-drawer-no-scroll');
    document.body.classList.add('slide-up-drawer-no-scroll');
  }
  
  unlockScroll() {
    document.documentElement.classList.remove('slide-up-drawer-no-scroll');
    document.body.classList.remove('slide-up-drawer-no-scroll');
    document.body.style.paddingRight = '';
  }

    /**
     * Set default stagger colors for all drawer opens
     * @param {string[]} colors - Array of color hex codes
     */
    setDefaultColors(colors) {
      if (Array.isArray(colors) && colors.length) {
        this.defaultColors = colors;
      }
    }

    /**
     * Get the default mobile breakpoint media query
     * @returns {string} Default mobile media query (max-width: 991px)
     */
    getDefaultMobileMQ() {
      return DEFAULT_MOBILE_MQ;
    }
  }

  window.SlideUpDrawer = new SlideUpDrawer();
})(window, document);
