/**
 * Shopee Pro Mobile v3.7 - High Compatibility Edition
 * Fixed: QR Code blank issue on slow mobile devices
 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    const qrTemp = document.getElementById('qrcode-temp');
    
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
    const btnClear = document.getElementById('btn-clear');
    const outputImg = document.getElementById('output-img');
    
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

    // --- Parser ---
    btnParse.addEventListener('click', () => {
        let raw = smartInput.value.trim();
        if (!raw) return;

        // 1. 抓取連結
        const linkMatch = raw.match(/https?:\/\/(shope\.ee|shopee\.tw|s\.shopee\.tw)\/[^\s]+/);
        if (linkMatch) { 
            state.affLink = linkMatch[0]; 
            affLinkInput.value = state.affLink; 
        }

        // 2. 抓取價格 (支援範圍與千分位)
        const priceRegex = /\$\s*([\d,]+)(?:\s*[-~]\s*\$?\s*([\d,]+))?/;
        const priceMatch = raw.match(priceRegex);
        if (priceMatch) {
            let p = priceMatch[1].replace(/,/g, '');
            if (priceMatch[2]) p += ' - ' + priceMatch[2].replace(/,/g, '');
            state.price = p;
            prodPriceInput.value = state.price;
        }

        // 3. 抓取名稱 (優化精確度)
        let cleanName = '';
        
        // 優先測試：蝦皮官方分享格式
        const officialMatch = raw.match(/我在蝦皮購物發現了這份好物！(.*?)！/);
        if (officialMatch && officialMatch[1].trim().length > 1) {
            cleanName = officialMatch[1].trim();
        } else {
            // 備選測試：排除法
            let t = raw;
            if (linkMatch) t = t.replace(linkMatch[0], '');
            // 移除價格區塊
            t = t.replace(/\$\s*[\d,]+(?:\s*[-~]\s*\$?\s*[\d,]+)?/g, '');
            
            // 移除特定冗詞但保留標點
            [/分享給你/g, /快來看看/g, /售價/g, /現在只要/g].forEach(r => t = t.replace(r, ''));
            
            let lines = t.split('\n').map(x => x.trim()).filter(x => x.length > 2);
            if (lines.length > 0) {
                // 取第一行作為名稱，並修剪行末可能殘留的標點
                cleanName = lines[0].replace(/[！，。！、]$/, '').trim();
            }
        }

        if (cleanName) {
            state.name = cleanName;
            prodNameInput.value = state.name;
        }
        
        render();
    });

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

    async function render() {
        if (state.isRendering) return;
        state.isRendering = true;
        
        // 為了支援手機長按，渲染時先隱藏圖片
        outputImg.style.opacity = '0.5';

        const w = 1080, h = state.size === '9-16' ? 1920 : 1080;
        canvas.width = w; canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        
        try { 
            await drawFullTemplate(ctx, w, h); 
            // 關鍵：將 Canvas 內容轉為 Image 支援手機長按
            outputImg.src = canvas.toDataURL('image/png', 0.9);
            outputImg.style.display = 'block';
            outputImg.style.opacity = '1';
            canvas.style.display = 'none'; // 隱藏 Canvas，讓使用者長按的是 Image
        } catch (e) {
            console.error("渲染出錯:", e);
        } finally { 
            state.isRendering = false; 
        }
    }

    async function drawFullTemplate(ctx, w, h) {
        const type = state.template, accent = state.themeColor, isSquare = state.size === '1-1';
        const weight = (state.fontFamily === 'Playfair Display') ? 700 : 900;
        drawBackground(ctx, w, h, type, accent);
        let curY = (type === 'magazine' || type === 'minimal') ? 100 : (type === 'polaroid' ? 120 : 180);
        const pad = 100, cw = w - pad * 2;
        const mImgH = h * (isSquare ? 0.35 : 0.45);
        if (state.productImage) { const d = drawShadowedImage(ctx, state.productImage, pad, curY, cw, mImgH, type === 'polaroid' ? 0 : 40); curY += d.h + (isSquare ? 40 : 80); } else { curY += 80; }
        const align = (type === 'aesthetic' || type === 'luxury') ? 'center' : 'left';
        let nCol = (type === 'luxury') ? accent : (type === 'cyber' ? '#fff' : (type === 'aesthetic' ? '#4a4a4a' : '#111'));
        if (type === 'magazine' || type === 'minimal' || type === 'polaroid') nCol = '#111';
        ctx.fillStyle = nCol;
        const nR = drawFlexibleText(ctx, state.name, pad, curY, cw, h * 0.25, isSquare ? 2 : 3, weight, state.fontFamily, 85, align);
        curY += nR.height + (isSquare ? 20 : 40);
        const qrS = isSquare ? 180 : 220;
        const pCol = (type === 'magazine' || type === 'polaroid') ? '#e74c3c' : accent;
        if (isSquare) {
            ctx.fillStyle = pCol; ctx.font = `900 100px Outfit`; ctx.textAlign = 'left'; ctx.fillText(`$${state.price}`, pad, h - 160);
            await drawQR(ctx, w - qrS - pad, h - qrS - 80, qrS, accent, (type === 'luxury' || type === 'cyber'));
        } else {
            ctx.fillStyle = pCol; ctx.font = `900 130px Outfit`; let pX = pad; if (align === 'center') { ctx.textAlign = 'center'; pX = w / 2; }
            ctx.fillText(`$${state.price}`, pX, curY + 110); ctx.textAlign = 'left';
            await drawQR(ctx, (align === 'center') ? (w-qrS)/2 : w-qrS-pad, h-qrS-150, qrS, accent, (type === 'luxury' || type === 'cyber'));
        }
        ctx.fillStyle = (type === 'luxury' || type === 'cyber') ? accent : '#aaa'; ctx.font = '700 32px "Noto Sans TC"'; ctx.textAlign = 'center'; ctx.fillText('我的蝦皮好物選品', w/2, h - 60); ctx.textAlign = 'left';
    }

    function drawBackground(ctx, w, h, type, accent) {
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        if (type === 'magazine') { ctx.fillStyle = '#f9f9f9'; ctx.fillRect(0,0,w,h); ctx.fillStyle = accent; ctx.fillRect(0,0,60,h); ctx.fillRect(w-20,0,20,h); }
        else if (type === 'aesthetic') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h); ctx.fillStyle = accent; ctx.globalAlpha = 0.08; ctx.beginPath(); ctx.arc(w/2, 400, 450, Math.PI, 0); ctx.lineTo(w/2+450, h); ctx.lineTo(w/2-450, h); ctx.fill(); ctx.globalAlpha = 1; }
        else if (type === 'luxury') { ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0,0,w,h); ctx.strokeStyle = accent; ctx.lineWidth = 4; ctx.strokeRect(60, 60, w-120, h-120); }
        else if (type === 'cyber') { ctx.fillStyle = '#050510'; ctx.fillRect(0,0,w,h); }
        else if (type === 'polaroid') { ctx.fillStyle = '#e8e6e1'; ctx.fillRect(0,0,w,h); ctx.fillStyle = '#fff'; ctx.fillRect(80, 80, w-160, h-200); }
        else { ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h); }
    }

    function drawShadowedImage(ctx, img, x, y, maxW, maxH, blur) {
        const r = img.width/img.height; let dw=maxW, dh=maxW/r; if(dh>maxH){ dh=maxH; dw=maxH*r; }
        ctx.save(); if(blur > 0){ ctx.shadowColor = 'rgba(0,0,0,0.1)'; ctx.shadowBlur = blur; ctx.shadowOffsetY = blur/2; }
        ctx.drawImage(img, x+(maxW-dw)/2, y, dw, dh); ctx.restore(); return { w: dw, h: dh };
    }

    function drawFlexibleText(ctx, text, x, y, maxWidth, maxHeight, maxLines, fontWeight, fontFamily, baseFontSize, align) {
        ctx.save(); let fS = baseFontSize; let lines = []; let lH = 0;
        while (fS > 18) {
            ctx.font = `${fontWeight} ${fS}px "${fontFamily}", sans-serif`; lH = fS * 1.4; lines = []; let cL = ''; const cs = Array.from(text);
            for (let i = 0; i < cs.length; i++) { let tL = cL + cs[i]; if (ctx.measureText(tL).width > maxWidth && i > 0) { lines.push(cL); cL = cs[i]; } else { cL = tL; } }
            lines.push(cL); if (lines.length <= maxLines && (lines.length * lH) <= maxHeight) break; fS -= 4;
        }
        ctx.textAlign = align; const sX = align === 'center' ? x + maxWidth/2 : x;
        lines.forEach((l, i) => { ctx.fillText(l, sX, y + (i * lH) + fS); }); ctx.restore(); return { height: lines.length * lH };
    }

    /** 核心修復：循環偵測渲染來源 */
    async function drawQR(ctx, x, y, size, color, isDark) {
        qrTemp.innerHTML = '';
        const qrcode = new QRCode(qrTemp, { text: state.affLink, width: 256, height: 256, colorDark: isDark ? "#ffffff" : color, colorLight: isDark ? "#000000" : "#ffffff", correctLevel: QRCode.CorrectLevel.H });
        
        return new Promise(resolve => {
            let attempts = 0;
            const check = () => {
                const img = qrTemp.querySelector('img');
                const canv = qrTemp.querySelector('canvas');
                // 同時檢查 Image 和 Canvas，確保不同瀏覽器相容性
                const source = (img && img.src && img.complete) ? img : (canv ? canv : null);

                if (source && (canv || (img && img.complete && img.naturalWidth > 0))) {
                    ctx.save();
                    if (!isDark) { ctx.fillStyle = '#fff'; ctx.fillRect(x-15, y-15, size+30, size+30); }
                    ctx.drawImage(source, x, y, size, size);
                    ctx.restore();
                    resolve();
                } else if (attempts < 30) { // 最多等待 1.5 秒 (30 * 50ms)
                    attempts++;
                    setTimeout(check, 50);
                } else {
                    console.warn("QR Code render timeout");
                    resolve();
                }
            };
            check();
        });
    }

    btnDownload.addEventListener('click', () => {
        const link = document.createElement('a'); link.download = `shopee-pro-${Date.now()}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click();
    });

    const btnCopyLink = document.getElementById('btn-copy-link');
    btnCopyLink.addEventListener('click', () => {
        const url = affLinkInput.value; if (!url) return;
        navigator.clipboard.writeText(url).then(() => {
            const t = btnCopyLink.textContent; btnCopyLink.textContent = '✅ 已複製';
            setTimeout(() => btnCopyLink.textContent = t, 2000);
        });
    });

    // --- Clear Function ---
    btnClear.addEventListener('click', () => {
        if (!confirm('確定要清空所有資訊嗎？')) return;
        
        // 重設狀態
        state.name = '質感生活系列｜極簡保溫杯';
        state.price = '499';
        state.oldPrice = '';
        state.affLink = 'https://shopee.tw';
        state.productImage = null;
        
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }

        // 重設 UI
        smartInput.value = '';
        prodNameInput.value = state.name;
        prodPriceInput.value = state.price;
        prodOldPriceInput.value = '';
        affLinkInput.value = state.affLink;
        imageInput.value = '';
        
        render();
    });

    document.fonts.ready.then(() => render());
});
