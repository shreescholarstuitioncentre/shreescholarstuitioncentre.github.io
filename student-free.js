    <section class="fr-section" id="sstcFreeSection" hidden>

        <div class="fr-head">
            <div>
                <span class="fr-tag">🎁 SSTC FREE'S</span>
                <h2>Free Chapters</h2>
                <p>Ye chapters bilkul free hain. Chapter par click karke yahin padhiye.</p>
            </div>

            <button type="button" class="fr-close" onclick="closeSstcFree()">✕ Close</button>
        </div>

        <div class="fr-list" id="frList"></div>

        <p class="fr-empty" id="frEmpty" hidden>Free chapters jaldi add honge.</p>

        <div class="fr-viewer" id="frViewer" hidden>

            <div class="fr-bar">
                <div>
                    <strong id="frViewerTitle">Free Chapter</strong>
                    <small id="frViewerMeta" style="display:block;opacity:.8;font-size:11px;"></small>
                </div>
                <div class="fr-bar-actions">
                    <button type="button" id="frPrev" onclick="sstcFreeStep(-1)" title="Previous">◀</button>
                    <button type="button" id="frNext" onclick="sstcFreeStep(1)" title="Next">▶</button>
                    <button type="button" onclick="sstcFreeFullscreen()" title="Fullscreen">⛶</button>
                    <button type="button" onclick="closeSstcFreeViewer()" title="Close">✕</button>
                </div>
            </div>

            <div class="fr-frame-wrap" id="frFrameWrap">
                <iframe id="frFrame" class="fr-frame" title="SSTC Free Chapter" src="about:blank"></iframe>
            </div>

        </div>

    </section>
