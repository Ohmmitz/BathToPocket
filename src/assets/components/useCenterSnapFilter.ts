import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

export function useCenterSnapFilter(selectedValue: string | null) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const filterRef = useCallback((node: HTMLDivElement | null) => setContainer(node), []);

  useLayoutEffect(() => {
    if (!container) return undefined;

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    if (buttons.length === 0) return undefined;

    const updateEdgeSpace = () => {
      const firstButton = buttons[0];
      const lastButton = buttons[buttons.length - 1];
      const columnGap = Number.parseFloat(window.getComputedStyle(container).columnGap) || 0;
      const contentWidth = buttons.reduce((width, button) => width + button.offsetWidth, 0)
        + columnGap * Math.max(0, buttons.length - 1);
      const hasOverflow = contentWidth > container.clientWidth + 1;
      container.classList.toggle('has-overflow', hasOverflow);
      const startSpace = hasOverflow ? Math.max(0, (container.clientWidth - firstButton.offsetWidth) / 2) : 0;
      const endSpace = hasOverflow ? Math.max(0, (container.clientWidth - lastButton.offsetWidth) / 2) : 0;
      container.style.setProperty('--filter-start-space', `${startSpace}px`);
      container.style.setProperty('--filter-end-space', `${endSpace}px`);
    };

    const centerSelected = (behavior: ScrollBehavior) => {
      const selectedButton = buttons.find((button) => button.getAttribute('aria-pressed') === 'true');
      if (!selectedButton) return;
      const containerRect = container.getBoundingClientRect();
      const selectedRect = selectedButton.getBoundingClientRect();
      const selectedCenter = selectedRect.left + selectedRect.width / 2;
      const containerCenter = containerRect.left + container.clientWidth / 2;
      container.scrollTo({
        left: container.scrollLeft + selectedCenter - containerCenter,
        behavior,
      });
    };

    updateEdgeSpace();
    const initialBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    centerSelected(initialBehavior);

    const resizeObserver = new ResizeObserver(() => {
      updateEdgeSpace();
      centerSelected('auto');
    });
    resizeObserver.observe(container);
    buttons.forEach((button) => resizeObserver.observe(button));

    return () => resizeObserver.disconnect();
  }, [container, selectedValue]);

  useEffect(() => {
    if (!container) return undefined;

    let activePointerId: number | null = null;
    let pointerStartX = 0;
    let scrollStartX = 0;
    let didDrag = false;
    let suppressNextClick = false;
    let suppressClickTimeout = 0;
    let scrollSettleTimeout = 0;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      activePointerId = event.pointerId;
      pointerStartX = event.clientX;
      scrollStartX = container.scrollLeft;
      didDrag = false;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return;
      const deltaX = event.clientX - pointerStartX;
      if (!didDrag && Math.abs(deltaX) > 5) {
        didDrag = true;
        container.classList.add('is-dragging');
      }
      if (didDrag) {
        event.preventDefault();
        container.scrollLeft = scrollStartX - deltaX;
      }
    };

    const finishPointer = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return;
      activePointerId = null;
      container.classList.remove('is-dragging');
      if (didDrag) {
        suppressNextClick = true;
        window.clearTimeout(suppressClickTimeout);
        suppressClickTimeout = window.setTimeout(() => {
          suppressNextClick = false;
        }, 0);
      }
    };

    const suppressDraggedClick = (event: MouseEvent) => {
      if (!suppressNextClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick = false;
    };

    const selectCenteredButton = () => {
      const containerCenter = container.getBoundingClientRect().left + container.clientWidth / 2;
      const centeredButton = buttons.reduce<HTMLButtonElement | null>((closest, button) => {
        if (!closest) return button;
        const buttonCenter = button.getBoundingClientRect().left + button.offsetWidth / 2;
        const closestCenter = closest.getBoundingClientRect().left + closest.offsetWidth / 2;
        return Math.abs(buttonCenter - containerCenter) < Math.abs(closestCenter - containerCenter)
          ? button
          : closest;
      }, null);
      if (centeredButton && centeredButton.getAttribute('aria-pressed') !== 'true') {
        centeredButton.click();
      }
    };

    const handleScroll = () => {
      window.clearTimeout(scrollSettleTimeout);
      scrollSettleTimeout = window.setTimeout(selectCenteredButton, 140);
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('click', suppressDraggedClick, true);
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', finishPointer);
    window.addEventListener('pointercancel', finishPointer);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('click', suppressDraggedClick, true);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishPointer);
      window.removeEventListener('pointercancel', finishPointer);
      window.clearTimeout(suppressClickTimeout);
      window.clearTimeout(scrollSettleTimeout);
      container.classList.remove('is-dragging');
    };
  }, [container]);

  return filterRef;
}
