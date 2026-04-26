/**
 * Shopee Pro Mobile v3.6 - Stable Layout & Font Fix
 * Senior Debug Engineer Audit: Stacking, Weight Mapping, and 1:1 Flip Logic Checked
 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    const qrTemp = document.getElementById('qrcode-temp');
    
    // UI Elements
    const smartInput = document.getElementById('smart-input');
    const btnParse = document.getElementById('btn-parse');
    const imageInput = document.getElementById('image-input');
    const uploadTrigger = document.getElementById('upload-trigger');
    const prodNameInput = document.getElementById('prod-name');
    const prodPriceInput = document.getElementById('prod-price');
    const prodOldPriceInput = document.getElementById('prod-old-price');
    const affLinkInput = document.getElementById('aff-link');
    const themeColorInput = document.getElementById('theme-color');
    const fontSelect = document.getElementById('font-select');
    const btnDownload = document.getElementById('btn-download');
    
    let state = {
        template: 'magazine',
        size: '9-16',
        productImage: null,
        name: '質感生活系列｜極簡保溫杯',
        price: '499',
        oldPrice: '',
        affLink: 'https://shopee.tw',
        themeColor: '#ee4d2d',
        fontFamily: 'Noto Sans TC',
        isRendering: false
    };

    // --- Parser v3.1 ---
    btnParse.addEventListener('click', () => {
        let raw = smartInput.value.trim();
        if (!raw) return;
        const linkMatch = raw.match(/https?:\/\/(shope\.ee|shopee\.tw|s\.shopee\.tw)\/[^\s]+/);
        if (linkMatch) { state.affLink = linkMatch[0]; affLinkInput.value = state.affLink; }
        const priceMatch = raw.match(/\$\s*([\d,]+)/);
        if (priceMatch) { state.price = priceMatch[1].replace(/,/g, ''); prodPriceInput.value = state.price; }
        const bracketMatch = raw.match(/[『「【](.*?)[』」】]/);
        if (bracketMatch && bracketMatch[1].length > 3) {
            state.name = bracketMatch[1].trim();
        } else {
            let titleStr = raw;
            if (linkMatch) titleStr = titleStr.replace(linkMatch[0], '');
            if (priceMatch) titleStr = titleStr.replace(/\$\s*[\d,]+/g, '');
            [/售價/g, /分享給你/g, /！/g, /，/g, /快來看看/g, /」/g, /「/g, /『/g, /』/g].forEach(reg => titleStr = titleStr.replace(reg, ' '));
            let lines = titleStr.split('\n').map(l => l.trim()).filter(l => l.length > 2);
            state.name = lines.length > 0 ? lines[0] : titleStr.trim();
        }
        prodNameInput.value = state.name;
        render();
    });

    // --- Designer Sync ---
    themeColorInput.addEventListener('input', (e) => { state.themeColor = e.target.value; render(); });
    fontSelect.addEventListener('change', (e) => { state.fontFamily = e.target.value; render(); });

    [prodNameInput, prodPriceInput, prodOldPriceInput, affLinkInput].forEach(el => {
        el.addEventListener('input', () => {
            state.name = prodNameInput.value; state.price = prodPriceInput.value;
            state.oldPrice = prodOldPriceInput.value; state.affLink = affLinkInput.value;
            render();
        });
    });

    let currentObjectUrl = null;
    uploadTrigger.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { state.productImage = img; render(); };
        img.src = currentObjectUrl;
    });

    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.template = btn.dataset.tpl;
            if (state.template === 'luxury') { state.themeColor = '#d4af37'; themeColorInput.value = '#d4af37'; }
            else if (state.template === 'cyber') { state.themeColor = '#00ffcc'; themeColorInput.value = '#00ffcc'; }
            render();
        });
    });

    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.size = btn.dataset.size;
            render();
        });
    });

    // --- High-Fidelity Rendering ---
    async function render() {
        if (state.isRendering) return;
        state.isRendering = true;
        const w = 1080;
        const h = state.size === '9-16' ? 1920 : 1080;
        canvas.width = w; canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        try { await drawFullTemplate(ctx, w, h); } finally { state.isRendering = false; }
    }

    async function drawFullTemplate(ctx, w, h) {
        const type = state.template;
        const accent = state.themeColor;
        const isSquare = state.size === '1-1';
        
        // Font Weight Mapping
        const weight = (state.fontFamily === 'Playfair Display') ? 700 : 900;

        drawBackground(ctx, w, h, type, accent);

        let currentY = (type === 'magazine' || type === 'minimal') ? 100 : (type === 'polaroid' ? 120 : 180);
        const padding = 100;
        const contentWidth = w - padding * 2;

        // A. Image
        const maxImgH = h * (isSquare ? 0.35 : 0.45);
        if (state.productImage) {
            const imgData = drawShadowedImage(ctx, state.productImage, padding, currentY, contentWidth, maxImgH, type === 'polaroid' ? 0 : 40);
            currentY += imgData.h + (isSquare ? 40 : 80);
        } else { currentY += 80; }

        // B. Title
        const nameAlign = (type === 'aesthetic' || type === 'luxury') ? 'center' : 'left';
        let nameColor = (type === 'luxury') ? accent : (type === 'cyber' ? '#fff' : (type === 'aesthetic' ? '#4a4a4a' : '#111'));
        if (type === 'magazine' || type === 'minimal' || type === 'polaroid') nameColor = '#111';
        
        ctx.fillStyle = nameColor;
        const nameMaxLines = isSquare ? 2 : 3;
        const nameResult = drawFlexibleText(ctx, state.name, padding, currentY, contentWidth, h * 0.25, nameMaxLines, weight, state.fontFamily, 85, nameAlign);
        currentY += nameResult.height + (isSquare ? 20 : 40);

        // C. Price & QR Code (Conditional Layout)
        const qrSize = isSquare ? 180 : 220;
        const priceColor = (type === 'magazine' || type === 'polaroid') ? '#e74c3c' : (type === 'cyber' ? '#00ffcc' : (type === 'luxury' ? accent : accent));
        
        if (isSquare) {
            // Horizontal Layout for 1:1
            ctx.fillStyle = priceColor;
            ctx.font = `900 100px Outfit`;
            ctx.textAlign = 'left';
            ctx.fillText(`$${state.price}`, padding, h - 160);
            await drawQR(ctx, w - qrSize - padding, h - qrSize - 80, qrSize, accent, (type === 'luxury' || type === 'cyber'));
        } else {
            // Vertical Stacking for 9:16
            ctx.fillStyle = priceColor;
            ctx.font = `900 130px Outfit`;
            let priceX = padding;
            if (nameAlign === 'center') { ctx.textAlign = 'center'; priceX = w / 2; }
            ctx.fillText(`$${state.price}`, priceX, currentY + 110);
            ctx.textAlign = 'left';
            await drawQR(ctx, (nameAlign === 'center') ? (w-qrSize)/2 : w-qrSize-padding, h-qrSize-150, qrSize, accent, (type === 'luxury' || type === 'cyber'));
        }

        // D. Footer Branding
        ctx.fillStyle = (type === 'luxury' || type === 'cyber') ? accent : '#aaa';
        ctx.font = '700 32px "Noto Sans TC"';
        const brandY = h - 60;
        ctx.textAlign = 'center';
        ctx.fillText('我的蝦皮好物選品', w/2, brandY);
        ctx.textAlign = 'left';
    }

    // --- Helpers ---
    function drawBackground(ctx, w, h, type, accent) {
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        if (type === 'magazine') {
            ctx.fillStyle = '#f9f9f9'; ctx.fillRect(0,0,w,h);
            ctx.fillStyle = accent; ctx.fillRect(0,0,60,h); ctx.fillRect(w-20,0,20,h);
        } else if (type === 'aesthetic') {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h);
            ctx.fillStyle = accent; ctx.globalAlpha = 0.08;
            ctx.beginPath(); ctx.arc(w/2, 400, 450, Math.PI, 0); ctx.lineTo(w/2+450, h); ctx.lineTo(w/2-450, h); ctx.fill(); ctx.globalAlpha = 1;
        } else if (type === 'luxury') {
            ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0,0,w,h);
            ctx.strokeStyle = accent; ctx.lineWidth = 4; ctx.strokeRect(60, 60, w-120, h-120);
        } else if (type === 'cyber') {
            ctx.fillStyle = '#050510'; ctx.fillRect(0,0,w,h);
        } else if (type === 'polaroid') {
            ctx.fillStyle = '#e8e6e1'; ctx.fillRect(0,0,w,h);
            ctx.fillStyle = '#fff'; ctx.fillRect(80, 80, w-160, h-200);
        } else {
            ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);
            ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 2;
            for(let i=100; i<w; i+=100) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,h); ctx.stroke(); }
            for(let j=100; j<h; j+=100) { ctx.beginPath(); ctx.moveTo(0,j); ctx.lineTo(w,j); ctx.stroke(); }
        }
    }

    function drawShadowedImage(ctx, img, x, y, maxW, maxH, blur) {
        const r = img.width/img.height; let dw=maxW, dh=maxW/r; if(dh>maxH){ dh=maxH; dw=maxH*r; }
        const dx = x + (maxW - dw) / 2;
        ctx.save(); if(blur > 0){ ctx.shadowColor = 'rgba(0,0,0,0.1)'; ctx.shadowBlur = blur; ctx.shadowOffsetY = blur/2; }
        ctx.drawImage(img, dx, y, dw, dh); ctx.restore();
        return { w: dw, h: dh };
    }

    function drawFlexibleText(ctx, text, x, y, maxWidth, maxHeight, maxLines, fontWeight, fontFamily, baseFontSize, align) {
        ctx.save();
        let fontSize = baseFontSize;
        let lines = [];
        let lineHeight = 0;
        while (fontSize > 18) {
            ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
            lineHeight = fontSize * 1.4;
            lines = []; let currentLine = '';
            const chars = Array.from(text);
            for (let i = 0; i < chars.length; i++) {
                let testLine = currentLine + chars[i];
                if (ctx.measureText(testLine).width > maxWidth && i > 0) { lines.push(currentLine); currentLine = chars[i]; } else { currentLine = testLine; }
            }
            lines.push(currentLine);
            if (lines.length <= maxLines && (lines.length * lineHeight) <= maxHeight) break;
            fontSize -= 4;
        }
        ctx.textAlign = align;
        const startX = align === 'center' ? x + maxWidth/2 : x;
        lines.forEach((line, index) => { ctx.fillText(line, startX, y + (index * lineHeight) + fontSize); });
        ctx.restore();
        return { height: lines.length * lineHeight };
    }

    async function drawQR(ctx, x, y, size, color, isDark) {
        qrTemp.innerHTML = '';
        return new Promise(resolve => {
            new QRCode(qrTemp, { text: state.affLink, width: 256, height: 256, colorDark: isDark ? "#ffffff" : color, colorLight: isDark ? "#000000" : "#ffffff", correctLevel: QRCode.CorrectLevel.H });
            setTimeout(() => {
                const img = qrTemp.querySelector('img');
                if (img && img.complete) {
                    ctx.save(); if (!isDark) { ctx.fillStyle = '#fff'; ctx.fillRect(x-15, y-15, size+30, size+30); }
                    ctx.drawImage(img, x, y, size, size); ctx.restore();
                }
                resolve();
            }, 250);
        });
    }

    btnDownload.addEventListener('click', () => {
        const link = document.createElement('a'); link.download = `shopee-pro-${Date.now()}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click();
    });

    const btnCopyLink = document.getElementById('btn-copy-link');
    btnCopyLink.addEventListener('click', () => {
        const url = affLinkInput.value;
        if (!url) return;
        navigator.clipboard.writeText(url).then(() => {
            const originalText = btnCopyLink.textContent;
            btnCopyLink.textContent = '✅ 已複製';
            setTimeout(() => btnCopyLink.textContent = originalText, 2000);
        });
    });

    document.fonts.ready.then(() => render());
});
