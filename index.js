(async function initPixelTarot() {
  const GRID_SIZE = 8;
  const LABEL_ROWS = 7;
  const LABEL_COLS = 30;

  const CARD_COLS = 30;
  const CARD_ROWS = 30;
  const SLOT_OFFSET_X = 3;
  const SLOT_OFFSET_TOP = 3;
  const SLOT_OFFSET_BOTTOM = 3;

  const SLOT_COLS = CARD_COLS + SLOT_OFFSET_X * 2;
  const SLOT_ROWS = SLOT_OFFSET_TOP + CARD_ROWS + LABEL_ROWS + SLOT_OFFSET_BOTTOM;
  const MAX_SLOTS = 5;

  let paletteList = [{ primary: "#4e4035" }];
  let cardsList = [];
  let backCardData = null;

  function snapToGrid(value) {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  //upload back json
  try {
    const [indexResponse, backResponse] = await Promise.all([
      fetch("./data/index.json"),
      fetch("./data/back.json").catch(() => null)
    ]);

    if (backResponse && backResponse.ok) {
      backCardData = await backResponse.json();
    } else {
      console.warn("cant find");
    }

    if (indexResponse.ok) {
      const indexData = await indexResponse.json();
      if (indexData.palette && indexData.palette.length > 0) {
        paletteList = indexData.palette;
      }

      const cardsConfig = indexData.cards || {};
      const majorFiles = cardsConfig.major_arcana || [];
      const minorConfig = cardsConfig.minor_arcana || {};

      const allCardPaths = [
        ...majorFiles,
        ...(minorConfig.wands || []),
        ...(minorConfig.pentacles || []),
        ...(minorConfig.cups || []),
        ...(minorConfig.swords || [])
      ];

      const cardPromises = allCardPaths.map(async (relativePath) => {
        const res = await fetch(`./data/${relativePath}`);
        if (!res.ok) {
          console.warn(`Không tìm thấy file lá bài: ./data/${relativePath}`);
          return null;
        }
        return res.json();
      });

      const loadedCards = await Promise.all(cardPromises);
      cardsList = loadedCards.filter((card) => card !== null);
    }
  } catch (err) {
    console.warn("Lỗi tải dữ liệu lá bài (hãy chạy qua Live Server):", err);
  }

  // shuffle
  let shuffledDeck = [];
  let lastDrawnCardIndex = -1;

  function shuffleAndRefillDeck() {
    if (cardsList.length === 0) return;

    const indices = cardsList.map((_, idx) => idx);

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    if (indices.length > 1 && indices[indices.length - 1] === lastDrawnCardIndex) {
      [indices[0], indices[indices.length - 1]] = [indices[indices.length - 1], indices[0]];
    }

    shuffledDeck = indices;
  }

  function drawNextCardIndex() {
    if (cardsList.length === 0) return -1;

    if (shuffledDeck.length === 0) {
      shuffleAndRefillDeck();
    }

    const nextIdx = shuffledDeck.pop();
    lastDrawnCardIndex = nextIdx;
    return nextIdx;
  }

  //snap grid
  const guideConsole = document.getElementById("guideConsole");
  const consoleToggleBtn = document.getElementById("consoleToggleBtn");
  const consoleCloseBtn = document.getElementById("consoleCloseBtn");
  const consoleAppBtn = document.getElementById("consoleAppBtn");
  const consoleHeader = guideConsole ? guideConsole.querySelector(".console-header") : null;

  function makeDraggable(targetEl, handleEl, onDragEndCallback) {
    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    function onStart(clientX, clientY) {
      isDragging = true;
      hasMoved = false;
      const rect = targetEl.getBoundingClientRect();
      initialLeft = snapToGrid(rect.left);
      initialTop = snapToGrid(rect.top);
      startX = clientX;
      startY = clientY;

      targetEl.style.left = `${initialLeft}px`;
      targetEl.style.top = `${initialTop}px`;
      targetEl.style.right = "auto";
      targetEl.style.bottom = "auto";
    }

    function onMove(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }

      const snappedLeft = snapToGrid(initialLeft + dx);
      const snappedTop = snapToGrid(initialTop + dy);

      const maxLeft = Math.floor((window.innerWidth - targetEl.offsetWidth) / GRID_SIZE) * GRID_SIZE;
      const maxTop = Math.floor((window.innerHeight - targetEl.offsetHeight) / GRID_SIZE) * GRID_SIZE;

      const newLeft = Math.max(0, Math.min(snappedLeft, maxLeft));
      const newTop = Math.max(0, Math.min(snappedTop, maxTop));

      targetEl.style.left = `${newLeft}px`;
      targetEl.style.top = `${newTop}px`;
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      if (onDragEndCallback) {
        onDragEndCallback(hasMoved);
      }
    }

    handleEl.addEventListener("mousedown", (e) => {
      if (e.target.closest("button") && handleEl !== targetEl) return;
      onStart(e.clientX, e.clientY);
    });

    window.addEventListener("mousemove", (e) => {
      onMove(e.clientX, e.clientY);
    });

    window.addEventListener("mouseup", onEnd);

    handleEl.addEventListener("touchstart", (e) => {
      if (e.target.closest("button") && handleEl !== targetEl) return;
      if (e.touches.length > 0) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (isDragging && e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener("touchend", onEnd);

    return () => hasMoved;
  }

  if (guideConsole && consoleToggleBtn && consoleCloseBtn && consoleAppBtn && consoleHeader) {
    let consoleWasDragged = false;
    let appBtnWasDragged = false;

    //console 1st place
    const initRect = guideConsole.getBoundingClientRect();
    guideConsole.style.left = `${snapToGrid(initRect.left)}px`;
    guideConsole.style.top = `${snapToGrid(initRect.top)}px`;
    guideConsole.style.right = "auto";
    guideConsole.style.bottom = "auto";

    makeDraggable(guideConsole, consoleHeader, (moved) => {
      consoleWasDragged = moved;
    });

    makeDraggable(consoleAppBtn, consoleAppBtn, (moved) => {
      appBtnWasDragged = moved;
    });

    const toggleMinimize = () => {
      const isMinimized = guideConsole.classList.toggle("minimized");
      consoleToggleBtn.textContent = isMinimized ? "+" : "-";
      consoleToggleBtn.title = isMinimized ? "Mở rộng" : "Thu lại";
    };

    consoleToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMinimize();
    });

    consoleHeader.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      if (consoleWasDragged) {
        consoleWasDragged = false;
        return;
      }
      toggleMinimize();
    });

    consoleCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = guideConsole.getBoundingClientRect();
      guideConsole.style.display = "none";

      consoleAppBtn.style.display = "flex";
      const maxAppLeft = Math.floor((window.innerWidth - consoleAppBtn.offsetWidth) / GRID_SIZE) * GRID_SIZE;
      const maxAppTop = Math.floor((window.innerHeight - consoleAppBtn.offsetHeight) / GRID_SIZE) * GRID_SIZE;

      const appLeft = Math.max(GRID_SIZE, Math.min(snapToGrid(rect.left), maxAppLeft));
      const appTop = Math.max(GRID_SIZE, Math.min(snapToGrid(rect.top), maxAppTop));

      consoleAppBtn.style.left = `${appLeft}px`;
      consoleAppBtn.style.top = `${appTop}px`;
      consoleAppBtn.style.right = "auto";
      consoleAppBtn.style.bottom = "auto";
    });

    consoleAppBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (appBtnWasDragged) {
        appBtnWasDragged = false;
        return;
      }
      const rect = consoleAppBtn.getBoundingClientRect();
      consoleAppBtn.style.display = "none";
      guideConsole.style.display = "block";

      const maxLeft = Math.floor((window.innerWidth - guideConsole.offsetWidth) / GRID_SIZE) * GRID_SIZE;
      const maxTop = Math.floor((window.innerHeight - guideConsole.offsetHeight) / GRID_SIZE) * GRID_SIZE;

      guideConsole.style.left = `${Math.max(GRID_SIZE, Math.min(snapToGrid(rect.left), maxLeft))}px`;
      guideConsole.style.top = `${Math.max(GRID_SIZE, Math.min(snapToGrid(rect.top), maxTop))}px`;
      guideConsole.style.right = "auto";
      guideConsole.style.bottom = "auto";
    });
  }

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "0";
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");

  const placedCards = [];
  let paletteIndex = 0;

  let nextCardIndex = drawNextCardIndex();
  let hoverGridPos = null;
  let isHoveringUI = false;

  let webTitleBounds = null;
  const noteEl = document.querySelector(".note");

  function updateNoteBounds() {
    if (!noteEl) return;
    const rect = noteEl.getBoundingClientRect();
    webTitleBounds = {
      minCol: Math.floor((rect.left + window.scrollX) / GRID_SIZE) + 2,
      maxCol: Math.ceil((rect.right + window.scrollX) / GRID_SIZE) - 2,
      minRow: Math.floor((rect.top + window.scrollY) / GRID_SIZE) + 2,
      maxRow: Math.ceil((rect.bottom + window.scrollY) / GRID_SIZE) - 2
    };
  }

  if (noteEl && "ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(() => updateNoteBounds());
    resizeObserver.observe(noteEl);
  }

  function isCellInNoteZone(col, row) {
    if (window.innerWidth <= 600) return false;

    if (!webTitleBounds) return false;
    return (
      col >= webTitleBounds.minCol &&
      col <= webTitleBounds.maxCol &&
      row >= webTitleBounds.minRow &&
      row <= webTitleBounds.maxRow
    );
  }

  function getViewportSize() {
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    return { width, height };
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = getViewportSize();

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateNoteBounds();
  }

  window.addEventListener("resize", resizeCanvas);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizeCanvas);
  }
  resizeCanvas();

  function getGridCoords(clientX, clientY) {
    const pageX = clientX + window.scrollX;
    const pageY = clientY + window.scrollY;
    return {
      col: Math.floor(pageX / GRID_SIZE),
      row: Math.floor(pageY / GRID_SIZE)
    };
  }

  function getCenteredSlotsLayout() {
    const { width, height } = getViewportSize();
    const viewCols = Math.floor(width / GRID_SIZE);
    const viewRows = Math.floor(height / GRID_SIZE);

    const slotCount = Math.max(1, Math.min(MAX_SLOTS, Math.floor(viewCols / SLOT_COLS)));

    const totalGridCols = slotCount * SLOT_COLS;
    const totalGridRows = SLOT_ROWS;

    const startCol = Math.max(0, Math.floor((viewCols - totalGridCols) / 2));
    const startRow = Math.max(0, Math.floor((viewRows - totalGridRows) / 2));

    return {
      slotCount,
      startCol,
      startRow,
      endCol: startCol + totalGridCols - 1,
      endRow: startRow + totalGridRows - 1
    };
  }

  function getSlotInfo(col, row) {
    const layout = getCenteredSlotsLayout();

    if (
      col < layout.startCol ||
      col > layout.endCol ||
      row < layout.startRow ||
      row > layout.endRow
    ) {
      return null;
    }

    const slotIndex = Math.floor((col - layout.startCol) / SLOT_COLS);
    if (slotIndex < 0 || slotIndex >= layout.slotCount) {
      return null;
    }

    const minCol = layout.startCol + slotIndex * SLOT_COLS;
    const minRow = layout.startRow;

    return {
      slotIndex,
      minCol,
      maxCol: minCol + SLOT_COLS - 1,
      minRow,
      maxRow: minRow + SLOT_ROWS - 1
    };
  }
  //offset
  function getCenteredCardAnchorInSlot(slot, card) {
    const pattern = card.pattern || [];
    const totalRows = pattern.length || CARD_ROWS;
    const totalCols = (pattern[0] && pattern[0].length) || CARD_COLS;
    const anchorCol = card.anchorCol ?? Math.floor(totalCols / 2);

    const horizontalMargin = Math.floor((SLOT_COLS - totalCols) / 2);
    const baseCol = slot.minCol + horizontalMargin + anchorCol;
    const baseRow = slot.minRow + SLOT_OFFSET_TOP + (totalRows - 1);

    return { baseCol, baseRow };
  }

  function getCardBounds(baseCol, baseRow, card) {
    const pattern = card.pattern || [];
    const totalRows = pattern.length || CARD_ROWS;
    const totalCols = (pattern[0] && pattern[0].length) || CARD_COLS;
    const anchorCol = card.anchorCol ?? Math.floor(totalCols / 2);

    const minCol = baseCol - anchorCol;
    const maxCol = minCol + totalCols - 1;
    const maxRow = baseRow + LABEL_ROWS;
    const minRow = baseRow - (totalRows - 1);

    return { minCol, maxCol, minRow, maxRow, totalCols, totalRows, anchorCol };
  }

  function isSlotOccupied(slotIndex) {
    return placedCards.some((c) => c.slotIndex === slotIndex);
  }

  function checkBoundsOverlap(bounds) {
    for (const existing of placedCards) {
      const ex = existing.bounds;
      const isOverlapping =
        bounds.minCol <= ex.maxCol &&
        bounds.maxCol >= ex.minCol &&
        bounds.minRow <= ex.maxRow &&
        bounds.maxRow >= ex.minRow;

      if (isOverlapping) return true;
    }

    if (window.innerWidth > 600 && webTitleBounds) {
      const overlapsNote =
        bounds.minCol <= webTitleBounds.maxCol &&
        bounds.maxCol >= webTitleBounds.minCol &&
        bounds.minRow <= webTitleBounds.maxRow &&
        bounds.maxRow >= webTitleBounds.minRow;

      if (overlapsNote) return true;
    }

    return false;
  }

  function isUIElement(targetEl) {
    return (
      targetEl &&
      (targetEl.closest(".console-box") ||
        targetEl.closest(".console-app-btn") ||
        targetEl.closest(".note"))
    );
  }

  function handleInteraction(clientX, clientY, targetEl) {
    isHoveringUI = Boolean(isUIElement(targetEl));
    const { col, row } = getGridCoords(clientX, clientY);
    hoverGridPos = { col, row };

    if (isCellInNoteZone(col, row)) return;
  }

  window.addEventListener("mousemove", (e) => {
    handleInteraction(e.clientX, e.clientY, e.target);
  });

  window.addEventListener("mouseleave", () => {
    hoverGridPos = null;
  });

  window.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }
  }, { passive: true });

  function handlePlaceCard(clientX, clientY, targetEl) {
    if (!cardsList || cardsList.length === 0 || nextCardIndex < 0) return;
    if (isUIElement(targetEl)) return;

    const { col, row } = getGridCoords(clientX, clientY);
    if (isCellInNoteZone(col, row)) return;

    const slot = getSlotInfo(col, row);
    if (!slot) return;

    if (isSlotOccupied(slot.slotIndex)) {
      return;
    }

    const selectedCard = cardsList[nextCardIndex];
    const { baseCol, baseRow } = getCenteredCardAnchorInSlot(slot, selectedCard);
    const bounds = getCardBounds(baseCol, baseRow, selectedCard);

    if (checkBoundsOverlap(bounds)) {
      return;
    }

    const selectedPalette = paletteList[paletteIndex % paletteList.length];
    paletteIndex++;

    placedCards.push({
      slotIndex: slot.slotIndex,
      data: selectedCard,
      name: selectedCard.name || "",
      baseCol: baseCol,
      baseRow: baseRow,
      anchorCol: bounds.anchorCol,
      bounds: bounds,
      pattern: selectedCard.pattern || [],
      primaryColor: selectedPalette.primary || "#4e4035",
      secondaryColor: selectedPalette.secondary || "#8B9E44",
      currentRowOffset: 0,
      lastGrowTime: performance.now(),
      growSpeed: 75
    });

    nextCardIndex = drawNextCardIndex();
  }

  let lastTouchTime = 0;

  window.addEventListener("click", (e) => {
    if (Date.now() - lastTouchTime < 500) return;
    handlePlaceCard(e.clientX, e.clientY, e.target);
  });

  window.addEventListener("touchstart", (e) => {
    lastTouchTime = Date.now();
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY, e.target);
      handlePlaceCard(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }
  }, { passive: true });

  function drawSlotGrid(scrollX, scrollY) {
    const layout = getCenteredSlotsLayout();

    const startX = layout.startCol * GRID_SIZE - scrollX;
    const startY = layout.startRow * GRID_SIZE - scrollY;
    const totalWidthPx = layout.slotCount * SLOT_COLS * GRID_SIZE;
    const totalHeightPx = SLOT_ROWS * GRID_SIZE;

    ctx.save();
    ctx.strokeStyle = "rgba(78, 64, 53, 0.3)";
    ctx.lineWidth = 1;

    ctx.beginPath();

    for (let i = 0; i <= layout.slotCount; i++) {
      const x = startX + i * SLOT_COLS * GRID_SIZE;
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + totalHeightPx);
    }

    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + totalWidthPx, startY);

    ctx.moveTo(startX, startY + totalHeightPx);
    ctx.lineTo(startX + totalWidthPx, startY + totalHeightPx);

    ctx.stroke();
    ctx.restore();
  }

  //back
  function getBackCardMetrics() {
    if (!backCardData || !backCardData.pattern) return null;

    const pattern = backCardData.pattern;
    const totalRows = pattern.length;
    const totalCols = (pattern[0] && pattern[0].length) || 60;
    const anchorRow = backCardData.anchorRow ?? Math.floor(totalRows / 2);

    let minActiveCol = totalCols;
    let maxActiveCol = 0;
    let minActiveRow = totalRows;
    let maxActiveRow = 0;

    for (let r = 0; r < totalRows; r++) {
      const rowStr = pattern[r] || "";
      for (let c = 0; c < rowStr.length; c++) {
        if (rowStr[c] !== ".") {
          if (c < minActiveCol) minActiveCol = c;
          if (c > maxActiveCol) maxActiveCol = c;
          if (r < minActiveRow) minActiveRow = r;
          if (r > maxActiveRow) maxActiveRow = r;
        }
      }
    }

    const visualCenterCol =
      minActiveCol <= maxActiveCol
        ? Math.floor((minActiveCol + maxActiveCol) / 2)
        : (backCardData.anchorCol ?? Math.floor(totalCols / 2));

    return {
      pattern,
      totalRows,
      anchorRow,
      visualCenterCol,
      minActiveCol,
      maxActiveCol,
      minActiveRow,
      maxActiveRow
    };
  }

  // if in the zone then neon
  function checkBackCardOverlapsPlaced(centerCol, centerRow) {
    if (placedCards.length === 0) return false;
    const metrics = getBackCardMetrics();
    if (!metrics || metrics.minActiveCol > metrics.maxActiveCol) return false;

    const backBounds = {
      minCol: centerCol + (metrics.minActiveCol - metrics.visualCenterCol),
      maxCol: centerCol + (metrics.maxActiveCol - metrics.visualCenterCol),
      minRow: centerRow + (metrics.minActiveRow - metrics.anchorRow),
      maxRow: centerRow + (metrics.maxActiveRow - metrics.anchorRow)
    };

    return checkBoundsOverlap(backBounds);
  }

  // if trùng
  function drawBackCardPattern(centerCol, centerRow, color, viewWidth, viewHeight, scrollX, scrollY) {
    const metrics = getBackCardMetrics();
    if (!metrics) return;

    const { pattern, totalRows, anchorRow, visualCenterCol } = metrics;
    ctx.fillStyle = color;

    for (let r = 0; r < totalRows; r++) {
      const rowStr = pattern[r];
      if (!rowStr) continue;
      const targetGridRow = centerRow + (r - anchorRow);

      for (let c = 0; c < rowStr.length; c++) {
        if (rowStr[c] === ".") continue;
        const targetGridCol = centerCol + (c - visualCenterCol);

        const screenX = targetGridCol * GRID_SIZE - scrollX;
        const screenY = targetGridRow * GRID_SIZE - scrollY;

        if (
          screenX + GRID_SIZE >= 0 &&
          screenX <= viewWidth &&
          screenY + GRID_SIZE >= 0 &&
          screenY <= viewHeight
        ) {
          ctx.fillRect(screenX + 1, screenY + 1, GRID_SIZE - 1, GRID_SIZE - 1);
        }
      }
    }
  }

  function render(now) {
    const { width: viewWidth, height: viewHeight } = getViewportSize();

    ctx.clearRect(0, 0, viewWidth, viewHeight);

    const scrollX = Math.round(window.scrollX);
    const scrollY = Math.round(window.scrollY);

    drawSlotGrid(scrollX, scrollY);

    for (const card of placedCards) {
      const pattern = card.pattern;
      const totalRows = pattern.length;
      const centerOffset = card.anchorCol;

      if (card.currentRowOffset < totalRows - 1) {
        if (now - card.lastGrowTime >= card.growSpeed) {
          card.currentRowOffset++;
          card.lastGrowTime = now;
        }
      }

      for (let step = 0; step <= card.currentRowOffset; step++) {
        const patternRowIndex = totalRows - 1 - step;
        const rowStr = pattern[patternRowIndex];
        if (!rowStr) continue;

        const targetGridRow = card.baseRow - step;

        for (let c = 0; c < rowStr.length; c++) {
          const pixelType = rowStr[c];
          if (pixelType === ".") continue;

          const targetGridCol = card.baseCol + (c - centerOffset);

          if (isCellInNoteZone(targetGridCol, targetGridRow)) {
            continue;
          }

          const screenX = targetGridCol * GRID_SIZE - scrollX;
          const screenY = targetGridRow * GRID_SIZE - scrollY;

          if (
            screenX + GRID_SIZE < 0 ||
            screenX > viewWidth ||
            screenY + GRID_SIZE < 0 ||
            screenY > viewHeight
          ) {
            continue;
          }

          ctx.fillStyle = pixelType === "P" ? card.primaryColor : card.secondaryColor;
          ctx.fillRect(screenX + 1, screenY + 1, GRID_SIZE - 1, GRID_SIZE - 1);
        }
      }

      if (card.name && card.currentRowOffset >= totalRows - 1) {
        const cardCenterX = (card.bounds.minCol + card.bounds.maxCol + 1) * GRID_SIZE * 0.5 - scrollX;
        const labelCenterY = (card.baseRow + 1 + LABEL_ROWS * 0.5) * GRID_SIZE - scrollY;
        const maxLabelWidth = LABEL_COLS * GRID_SIZE;

        if (
          cardCenterX + maxLabelWidth / 2 >= 0 &&
          cardCenterX - maxLabelWidth / 2 <= viewWidth &&
          labelCenterY + 20 >= 0 &&
          labelCenterY - 20 <= viewHeight
        ) {
          ctx.save();
          ctx.font = "25px 'MedievalSharp', cursive";
          ctx.fillStyle = card.primaryColor;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(card.name, cardCenterX, labelCenterY, maxLabelWidth);
          ctx.restore();
        }
      }
    }

    if (hoverGridPos && !isHoveringUI && cardsList.length > 0 && nextCardIndex >= 0) {
      const previewCard = cardsList[nextCardIndex];
      const slot = getSlotInfo(hoverGridPos.col, hoverGridPos.row);

      const selectedPalette = paletteList[paletteIndex % paletteList.length];
      const cardColor = selectedPalette.primary || "#4e4035";

      let isBlocked = true;
      let previewBounds = null;

      if (slot && !isSlotOccupied(slot.slotIndex)) {
        const centeredAnchor = getCenteredCardAnchorInSlot(slot, previewCard);
        previewBounds = getCardBounds(centeredAnchor.baseCol, centeredAnchor.baseRow, previewCard);
        if (!checkBoundsOverlap(previewBounds)) {
          isBlocked = false;
        }
      }

      ctx.save();
      if (isBlocked) {
        const isTouchingPlacedCard = checkBackCardOverlapsPlaced(
          hoverGridPos.col,
          hoverGridPos.row
        );
        const backRenderColor = isTouchingPlacedCard ? "#e7f70f" : cardColor;

        drawBackCardPattern(
          hoverGridPos.col,
          hoverGridPos.row,
          backRenderColor,
          viewWidth,
          viewHeight,
          scrollX,
          scrollY
        );
      } else {
        ctx.fillStyle = cardColor;

        const minC = previewBounds.minCol;
        const maxC = previewBounds.maxCol;
        const minR = previewBounds.minRow;
        const maxR = previewBounds.maxRow;

        const cornerCoords = [
          { c: minC, r: minR }, { c: minC + 1, r: minR }, { c: minC, r: minR + 1 },
          { c: maxC, r: minR }, { c: maxC - 1, r: minR }, { c: maxC, r: minR + 1 },
          { c: minC, r: maxR }, { c: minC + 1, r: maxR }, { c: minC, r: maxR - 1 },
          { c: maxC, r: maxR }, { c: maxC - 1, r: maxR }, { c: maxC, r: maxR - 1 }
        ];

        for (const pt of cornerCoords) {
          const screenX = pt.c * GRID_SIZE - scrollX;
          const screenY = pt.r * GRID_SIZE - scrollY;

          if (
            screenX + GRID_SIZE >= 0 &&
            screenX <= viewWidth &&
            screenY + GRID_SIZE >= 0 &&
            screenY <= viewHeight
          ) {
            ctx.fillRect(screenX + 1, screenY + 1, GRID_SIZE - 1, GRID_SIZE - 1);
          }
        }

        const anchorX = hoverGridPos.col * GRID_SIZE - scrollX;
        const anchorY = hoverGridPos.row * GRID_SIZE - scrollY;
        ctx.fillRect(anchorX + 1, anchorY + 1, GRID_SIZE - 1, GRID_SIZE - 1);
      }
      ctx.restore();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();