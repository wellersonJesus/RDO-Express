/**
 * ═══════════════════════════════════════════════════════════════
 *  RDO EXPRESS — MAPA DE ROTAS (chat_mapa.js v5 — 100% Online)
 *  Tiles: OpenStreetMap    |  Rotas: OSRM Demo Server
 *  Geocoding: Nominatim    |  Lib: Leaflet CDN
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    /* ─── Valor por KM (ajuste conforme sua regra de negócio) ─── */
    var VALOR_POR_KM = 2.50; // R$ por km

    /* ─── Cores para até 10 rotas ─── */
    var CORES = [
        '#E74C3C', '#2980B9', '#27AE60', '#F39C12', '#8E44AD',
        '#1ABC9C', '#D35400', '#2C3E50', '#C0392B', '#16A085'
    ];

    /* ═══════════════════════════════════════════
       1. PARSER — Extrai rotas da mensagem RDO
    ═══════════════════════════════════════════ */
    function parsearRotas(texto) {
        if (!texto || typeof texto !== 'string') return [];
        var rotas = [];
        var regex = /📍\s*(\d+)\.\s*De:\s*(.+?)\s*\|\s*Para:\s*(.+)/gi;
        var m;
        while ((m = regex.exec(texto)) !== null) {
            rotas.push({
                numero: parseInt(m[1], 10),
                origem: m[2].trim(),
                destino: m[3].trim(),
                cor: CORES[(parseInt(m[1], 10) - 1) % CORES.length]
            });
        }
        return rotas;
    }

    /* ═══════════════════════════════════════════
       2. GEOCODIFICAÇÃO — Nominatim (online)
    ═══════════════════════════════════════════ */
    function geocodificar(endereco) {
        var url = 'https://nominatim.openstreetmap.org/search'
            + '?format=json&limit=1&countrycodes=br&q='
            + encodeURIComponent(endereco);

        return fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.length > 0) {
                    return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
                }
                return null;
            })
            .catch(function () { return null; });
    }

    /* ═══════════════════════════════════════════
       3. ROTA — OSRM Demo (online)
    ═══════════════════════════════════════════ */
    function rotaOSRM(orig, dest) {
        var url = 'https://router.project-osrm.org/route/v1/driving/'
            + orig.lng + ',' + orig.lat + ';'
            + dest.lng + ',' + dest.lat
            + '?overview=full&geometries=geojson&steps=false';

        return fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.code === 'Ok' && d.routes && d.routes.length > 0) {
                    var rt = d.routes[0];
                    return {
                        km: (rt.distance / 1000).toFixed(1),
                        min: Math.round(rt.duration / 60),
                        geo: rt.geometry
                    };
                }
                return null;
            })
            .catch(function () { return null; });
    }

    /* ═══════════════════════════════════════════
       4. DELAY (rate-limit Nominatim: 1 req/s)
    ═══════════════════════════════════════════ */
    function esperar(ms) {
        return new Promise(function (ok) { setTimeout(ok, ms); });
    }

    /* ═══════════════════════════════════════════
       5. ÍCONE NUMERADO
    ═══════════════════════════════════════════ */
    function icone(cor, tipo, num) {
        var label = tipo === 'A' ? 'A' + num : 'B' + num;
        return L.divIcon({
            className: 'rdo-marker',
            html: '<div style="'
                + 'background:' + cor + ';color:#fff;'
                + 'width:28px;height:28px;border-radius:50%;'
                + 'display:flex;align-items:center;justify-content:center;'
                + 'font-size:11px;font-weight:700;'
                + 'border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);'
                + '">' + label + '</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    }

    /* ═══════════════════════════════════════════
       6. FORMATAR MOEDA
    ═══════════════════════════════════════════ */
    function moeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    /* ═══════════════════════════════════════════
       7. FORMATAR TEMPO (ex: 1h 25min)
    ═══════════════════════════════════════════ */
    function formatarTempo(minutos) {
        if (minutos < 60) return minutos + ' min';
        var h = Math.floor(minutos / 60);
        var m = minutos % 60;
        return h + 'h ' + (m > 0 ? m + 'min' : '');
    }

    /* ═══════════════════════════════════════════
       8. PREENCHER NOME DO SOLICITANTE
    ═══════════════════════════════════════════ */
    window.preencherDadosMapa = function (nome) {
        var el = document.getElementById('header-nome-solicitante');
        if (el) el.textContent = nome || 'Não identificado';
    };

    /* ═══════════════════════════════════════════
       9. RENDERIZAR MAPA PRINCIPAL
    ═══════════════════════════════════════════ */
    window.renderizarMapaUnificado = async function (texto) {

        var containerMapa = document.getElementById('container-mapa-visual');
        var listaEl       = document.getElementById('lista-rotas-editavel');
        var loaderEl      = document.getElementById('mapa-loader');
        var footerResumo  = document.getElementById('footer-resumo-dados');

        if (!containerMapa) {
            console.error('[chat_mapa] #container-mapa-visual não encontrado');
            return;
        }

        // ── Mostra loader ──
        if (loaderEl) loaderEl.style.display = '';
        containerMapa.style.display = 'none';
        if (listaEl) listaEl.innerHTML = '';
        if (footerResumo) footerResumo.innerHTML = '<span class="text-muted small">Calculando...</span>';

        // ── Parse ──
        var rotas = parsearRotas(texto);
        if (rotas.length === 0) {
            if (loaderEl) loaderEl.innerHTML =
                '<p class="text-danger small mb-0">'
                + '<i class="bi bi-exclamation-triangle me-1"></i>'
                + 'Nenhuma rota encontrada na mensagem.</p>';
            return;
        }

        // ── Garante Leaflet CSS ──
        if (!document.getElementById('leaflet-css-rdo')) {
            var link = document.createElement('link');
            link.id = 'leaflet-css-rdo';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // ── Garante Leaflet JS ──
        if (typeof L === 'undefined') {
            await new Promise(function (resolve) {
                if (document.querySelector('script[src*="leaflet@1.9.4/dist/leaflet.js"]')) {
                    // Já tem o script, espera carregar
                    var check = setInterval(function () {
                        if (typeof L !== 'undefined') { clearInterval(check); resolve(); }
                    }, 100);
                } else {
                    var s = document.createElement('script');
                    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    s.onload = function () { resolve(); };
                    s.onerror = function () { console.error('Falha ao carregar Leaflet'); resolve(); };
                    document.body.appendChild(s);
                }
            });
        }

        if (typeof L === 'undefined') {
            if (loaderEl) loaderEl.innerHTML =
                '<p class="text-danger small mb-0">'
                + '<i class="bi bi-exclamation-triangle me-1"></i>'
                + 'Falha ao carregar biblioteca do mapa.</p>';
            return;
        }

        // ── Inicializa Leaflet ──
        containerMapa.innerHTML = '';
        containerMapa.style.display = 'block';

        var mapa = L.map(containerMapa, {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([-19.9191, -43.9386], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19
        }).addTo(mapa);

        // Força renderização correta
        setTimeout(function () { mapa.invalidateSize(); }, 300);

        // ── Processa rotas ──
        var bounds = L.latLngBounds([]);
        var totalKm = 0;
        var totalMin = 0;
        var htmlLista = '';

        for (var i = 0; i < rotas.length; i++) {
            var r = rotas[i];

            // Geocodifica com delay
            if (i > 0) await esperar(1100);
            var origGeo = await geocodificar(r.origem);
            await esperar(1100);
            var destGeo = await geocodificar(r.destino);

            if (!origGeo || !destGeo) {
                htmlLista += _itemErro(r);
                continue;
            }

            // Rota OSRM
            var res = await rotaOSRM(origGeo, destGeo);

            if (!res) {
                htmlLista += _itemErro(r);
                continue;
            }

            // ── Desenha no mapa ──
            L.geoJSON(res.geo, {
                style: { color: r.cor, weight: 5, opacity: 0.8 }
            }).addTo(mapa);

            L.marker([origGeo.lat, origGeo.lng], { icon: icone(r.cor, 'A', r.numero) })
                .addTo(mapa)
                .bindPopup('<b>Origem ' + r.numero + '</b><br>' + r.origem);

            L.marker([destGeo.lat, destGeo.lng], { icon: icone(r.cor, 'B', r.numero) })
                .addTo(mapa)
                .bindPopup('<b>Destino ' + r.numero + '</b><br>' + r.destino);

            bounds.extend([origGeo.lat, origGeo.lng]);
            bounds.extend([destGeo.lat, destGeo.lng]);

            totalKm += parseFloat(res.km);
            totalMin += res.min;

            htmlLista += _itemOk(r, res);
        }

        // ── Ajusta zoom ──
        if (bounds.isValid()) {
            mapa.fitBounds(bounds, { padding: [40, 40] });
            setTimeout(function () { mapa.invalidateSize(); }, 400);
        }

        // ── Esconde loader ──
        if (loaderEl) loaderEl.style.display = 'none';

        // ── Lista ──
        if (listaEl) listaEl.innerHTML = htmlLista;

        // ── Footer com KM | Tempo | Valor — mesma linha ──
        var totalValor = totalKm * VALOR_POR_KM;
        if (footerResumo) {
            footerResumo.innerHTML = ''
                + '<div class="d-flex align-items-center gap-3 flex-wrap">'
                + '  <div class="d-flex align-items-center gap-1">'
                + '    <i class="bi bi-signpost-split-fill text-danger fs-6"></i>'
                + '    <span class="fw-bold text-dark">' + totalKm.toFixed(1) + ' km</span>'
                + '  </div>'
                + '  <div class="vr" style="height:20px;"></div>'
                + '  <div class="d-flex align-items-center gap-1">'
                + '    <i class="bi bi-clock-fill text-primary fs-6"></i>'
                + '    <span class="fw-bold text-dark">' + formatarTempo(totalMin) + '</span>'
                + '  </div>'
                + '  <div class="vr" style="height:20px;"></div>'
                + '  <div class="d-flex align-items-center gap-1">'
                + '    <i class="bi bi-cash-stack text-success fs-6"></i>'
                + '    <span class="fw-bold text-dark">' + moeda(totalValor) + '</span>'
                + '  </div>'
                + '</div>';
        }

        // ── Salva dados ──
        window.__rdoRotasCalculadas = {
            rotas: rotas,
            totalKm: totalKm.toFixed(1),
            totalMin: totalMin,
            totalValor: totalValor.toFixed(2)
        };
    };

    /* ═══════════════════════════════════════════
       10. HELPERS — Itens da lista
    ═══════════════════════════════════════════ */
    function _itemOk(r, res) {
        return ''
            + '<div class="d-flex align-items-start gap-2 p-2 border-bottom"'
            + ' style="border-left:4px solid ' + r.cor + ' !important;">'
            + ' <div class="flex-grow-1">'
            + '   <div class="fw-semibold small text-dark">'
            + '     <i class="bi bi-geo-alt-fill me-1" style="color:' + r.cor + '"></i>'
            + '     Rota ' + r.numero
            + '   </div>'
            + '   <div class="text-muted" style="font-size:0.78rem;">'
            + '     <b>De:</b> ' + r.origem + '<br>'
            + '     <b>Para:</b> ' + r.destino
            + '   </div>'
            + ' </div>'
            + ' <div class="text-end flex-shrink-0" style="min-width:80px;">'
            + '   <span class="badge rounded-pill" style="background:' + r.cor + ';font-size:0.72rem;">'
            + '     ' + res.km + ' km'
            + '   </span><br>'
            + '   <small class="text-muted"><i class="bi bi-clock me-1"></i>' + res.min + ' min</small>'
            + ' </div>'
            + '</div>';
    }

    function _itemErro(r) {
        return ''
            + '<div class="d-flex align-items-start gap-2 p-2 border-bottom bg-warning-subtle">'
            + ' <div class="flex-grow-1">'
            + '   <div class="fw-semibold small text-dark">'
            + '     <i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>'
            + '     Rota ' + r.numero + ' — Não calculada'
            + '   </div>'
            + '   <div class="text-muted" style="font-size:0.78rem;">'
            + '     <b>De:</b> ' + r.origem + '<br>'
            + '     <b>Para:</b> ' + r.destino
            + '   </div>'
            + ' </div>'
            + '</div>';
    }

    /* ═══════════════════════════════════════════
       11. AVANÇAR / VOLTAR
    ═══════════════════════════════════════════ */
    window.prosseguirParaFormulario = async function () {
        var el = document.getElementById('modalMapa');
        if (el) { try { bootstrap.Modal.getInstance(el)?.hide(); } catch (e) {} }
        await esperar(350);
        document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');

        var ok = await window.loadModal('checkout_form.html');
        if (!ok) return;

        var fm = document.getElementById('modalCheckout');
        if (fm) {
            var modal = new bootstrap.Modal(fm, { backdrop: 'static', keyboard: false });
            modal.show();
        }
    };

    window.voltarParaMapa = async function () {
        var el = document.getElementById('modalCheckout');
        if (el) { try { bootstrap.Modal.getInstance(el)?.hide(); } catch (e) {} }
        await esperar(350);
        document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');

        var ok = await window.loadModal('mapa_clientes.html');
        if (!ok) return;

        var modalEl = document.getElementById('modalMapa');
        if (modalEl) {
            modalEl.addEventListener('shown.bs.modal', function handler() {
                modalEl.removeEventListener('shown.bs.modal', handler);
                if (window.__rdoUltimaMensagem) {
                    window.preencherDadosMapa(window.__rdoNomeSolicitante);
                    window.renderizarMapaUnificado(window.__rdoUltimaMensagem);
                }
            });
            new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false }).show();
        }
    };

})();
