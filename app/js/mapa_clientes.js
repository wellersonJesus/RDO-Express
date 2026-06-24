(function () {
    'use strict';

    var VALOR_POR_KM = 2.50;

    var CORES = [
        '#E74C3C', '#2980B9', '#27AE60', '#F39C12', '#8E44AD',
        '#1ABC9C', '#D35400', '#2C3E50', '#C0392B', '#16A085'
    ];

    function parsearRotas(texto) {
        if (!texto || typeof texto !== 'string') return [];
        var rotas = [];
        var regex = /📍\s*(\d+)\.\s*De:\s*(.+?)\s*\|\s*Para:\s*(.+)/gi;
        var m;
        while ((m = regex.exec(texto)) !== null) {
            rotas.push({
                numero:  parseInt(m[1], 10),
                origem:  m[2].trim(),
                destino: m[3].trim(),
                cor:     CORES[(parseInt(m[1], 10) - 1) % CORES.length]
            });
        }
        if (rotas.length > 0) return rotas;
        var idx = 0;
        texto.split('\n').forEach(function (linha) {
            linha = linha.trim();
            if (!linha) return;
            var m2 = linha.match(/De:\s*(.+?)\s*(?:\||–|—|-|→)\s*Para:\s*(.+)/i);
            if (!m2) m2 = linha.match(/De:\s*(.+?)\s+Para:\s*(.+)/i);
            if (m2) {
                var origem = m2[1].replace(/^\d+[\.\)\-]\s*/, '').trim();
                var destino = m2[2].trim();
                if (origem && origem !== '...' && destino && destino !== '...') {
                    idx++;
                    rotas.push({
                        numero: idx,
                        origem:  origem,
                        destino: destino,
                        cor:     CORES[(idx - 1) % CORES.length]
                    });
                }
            }
        });
        return rotas;
    }

    function geocodificar(endereco) {
        var busca = endereco;
        if (!/MG|Minas Gerais/i.test(busca)) busca += ', MG';
        if (!/Brasil|Brazil/i.test(busca)) busca += ', Brasil';
        var url = 'https://nominatim.openstreetmap.org/search'
            + '?format=json&limit=1&countrycodes=br&q='
            + encodeURIComponent(busca);
        return fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.length > 0) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
                return null;
            })
            .catch(function () { return null; });
    }

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
                        km:       (rt.distance / 1000).toFixed(1),
                        min:      Math.round(rt.duration / 60),
                        geo:      rt.geometry,
                        caminho:  rt.geometry.coordinates.map(function (c) { return [c[1], c[0]]; })
                    };
                }
                return null;
            })
            .catch(function () { return null; });
    }

    function esperar(ms) {
        return new Promise(function (ok) { setTimeout(ok, ms); });
    }

    function icone(cor, tipo, num) {
        var label = tipo === 'A' ? 'A' + num : 'B' + num;
        return L.divIcon({
            className:  'rdo-marker',
            html:       '<div style="background:' + cor + ';color:#fff;width:28px;height:28px;'
                      + 'border-radius:50%;display:flex;align-items:center;justify-content:center;'
                      + 'font-size:11px;font-weight:700;border:2px solid #fff;'
                      + 'box-shadow:0 2px 6px rgba(0,0,0,.35);">' + label + '</div>',
            iconSize:   [28, 28],
            iconAnchor: [14, 14]
        });
    }

    function moeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatarTempo(minutos) {
        if (minutos < 60) return minutos + ' min';
        var h = Math.floor(minutos / 60);
        var m = minutos % 60;
        return h + 'h ' + (m > 0 ? m + 'min' : '');
    }

    function _itemOk(r, res) {
        return '<div class="d-flex align-items-start gap-2 p-2 border-bottom"'
            + ' style="border-left:4px solid ' + r.cor + ' !important;">'
            + '<div class="flex-grow-1">'
            + '<div class="fw-semibold small text-dark">'
            + '<i class="bi bi-geo-alt-fill me-1" style="color:' + r.cor + '"></i>Rota ' + r.numero + '</div>'
            + '<div class="text-muted" style="font-size:.78rem;">'
            + '<b>De:</b> ' + r.origem + '<br><b>Para:</b> ' + r.destino + '</div>'
            + '</div>'
            + '<div class="text-end flex-shrink-0" style="min-width:80px;">'
            + '<span class="badge rounded-pill" style="background:' + r.cor + ';font-size:.72rem;">'
            + res.km + ' km</span><br>'
            + '<small class="text-muted"><i class="bi bi-clock me-1"></i>' + res.min + ' min</small>'
            + '</div></div>';
    }

    function _itemErro(r) {
        return '<div class="d-flex align-items-start gap-2 p-2 border-bottom bg-warning-subtle">'
            + '<div class="flex-grow-1">'
            + '<div class="fw-semibold small text-dark">'
            + '<i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>'
            + 'Rota ' + r.numero + ' — Não calculada</div>'
            + '<div class="text-muted" style="font-size:.78rem;">'
            + '<b>De:</b> ' + r.origem + '<br><b>Para:</b> ' + r.destino + '</div>'
            + '</div></div>';
    }

    function carregarLeaflet() {
        return new Promise(function (resolve) {
            if (typeof L !== 'undefined') { resolve(); return; }
            if (!document.getElementById('leaflet-css-rdo')) {
                var link  = document.createElement('link');
                link.id   = 'leaflet-css-rdo';
                link.rel  = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }
            if (document.querySelector('script[src*="leaflet@1.9.4/dist/leaflet.js"]')) {
                var check = setInterval(function () {
                    if (typeof L !== 'undefined') { clearInterval(check); resolve(); }
                }, 100);
                return;
            }
            var s     = document.createElement('script');
            s.src     = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.onload  = function () { resolve(); };
            s.onerror = function () { resolve(); };
            document.body.appendChild(s);
        });
    }

    function _renderizarMapaComCoordenadas() {
        var container = document.getElementById('container-mapa-visual');
        if (!container) return;
        if (window._leafletMapInstance) {
            try { window._leafletMapInstance.remove(); } catch (_) {}
            window._leafletMapInstance = null;
        }
        container.innerHTML = '';
        container.style.display = 'block';
        if (!container.style.height || container.style.height === '0px') container.style.height = '350px';
        var dados = window.dadosPedidoAtual;
        if (!dados || !dados.coordenadas || dados.coordenadas.length === 0) return;
        if (typeof L === 'undefined') return;
        var mapa = L.map(container, { zoomControl: true, scrollWheelZoom: true })
            .setView([-19.9191, -43.9386], 12);
        window._leafletMapInstance = mapa;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19
        }).addTo(mapa);
        var cores = ['#E74C3C', '#2980B9', '#27AE60', '#F39C12', '#8E44AD', '#1ABC9C', '#D35400', '#2C3E50'];
        var todosOsPontos = [];
        dados.coordenadas.forEach(function (caminho, i) {
            if (!caminho || caminho.length === 0) return;
            L.polyline(caminho, { color: cores[i % cores.length], weight: 5, opacity: 0.85 }).addTo(mapa);
            var criarIconeEmoji = function (emoji) {
                return L.divIcon({
                    html: '<div style="font-size:22px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3));">' + emoji + '</div>',
                    className: 'custom-div-icon', iconSize: [28, 28], iconAnchor: [14, 14]
                });
            };
            if (i === 0) L.marker(caminho[0], { icon: criarIconeEmoji('🏁') }).addTo(mapa).bindPopup('<strong>Origem</strong>');
            if (i === dados.coordenadas.length - 1) {
                L.marker(caminho[caminho.length - 1], { icon: criarIconeEmoji('📍') }).addTo(mapa).bindPopup('<strong>Destino Final</strong>');
            } else {
                L.marker(caminho[caminho.length - 1], { icon: criarIconeEmoji('🔄') }).addTo(mapa).bindPopup('<strong>Parada ' + (i + 1) + '</strong>');
            }
            caminho.forEach(function (p) { todosOsPontos.push(p); });
        });
        if (todosOsPontos.length > 0) mapa.fitBounds(L.latLngBounds(todosOsPontos).pad(0.15));
        setTimeout(function () { mapa.invalidateSize(); }, 400);
    }

    function _abrirModalForm() {
        window.loadModal('form_clientes.html').then(function (carregou) {
            if (!carregou) return;
            var modalEl = document.getElementById('modalFormulario');
            if (!modalEl) return;
            var inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) { try { inst.dispose(); } catch (e) {} }
            var modalForm = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
            modalEl.addEventListener('shown.bs.modal', function () {
                if (typeof window.preencherDadosFormulario === 'function') window.preencherDadosFormulario();
                if (typeof window.calcularTudo === 'function') window.calcularTudo();
            }, { once: true });
            modalForm.show();
        });
    }

    function _abrirModalMapa() {
        window.loadModal('mapa_clientes.html').then(function (carregou) {
            if (!carregou) return;
            var modalEl = document.getElementById('modalMapa');
            if (!modalEl) return;
            var inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) { try { inst.dispose(); } catch (e) {} }
            var modalMapa = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
            modalEl.addEventListener('shown.bs.modal', function () {
                var dados = window.dadosPedidoAtual || {};
                var elHeader = document.getElementById('header-nome-solicitante');
                if (elHeader) elHeader.innerText = dados.solicitante || 'Cliente';
                var footerResumo = document.getElementById('footer-resumo-dados');
                if (footerResumo && dados.distancia) {
                    footerResumo.innerHTML =
                        '<div class="d-flex align-items-center gap-3 flex-wrap">'
                        + '<div class="d-flex align-items-center gap-1">'
                        + '<i class="bi bi-signpost-split-fill text-danger fs-6"></i>'
                        + '<span class="fw-bold text-dark">' + dados.distancia + ' km</span></div>'
                        + '<div class="vr" style="height:20px;"></div>'
                        + '<div class="d-flex align-items-center gap-1">'
                        + '<i class="bi bi-clock-fill text-primary fs-6"></i>'
                        + '<span class="fw-bold text-dark">' + (dados.tempo || '--') + '</span></div>'
                        + '<div class="vr" style="height:20px;"></div>'
                        + '<div class="d-flex align-items-center gap-1">'
                        + '<i class="bi bi-cash-stack text-success fs-6"></i>'
                        + '<span class="fw-bold text-dark">' + (dados.valor || 'R$ 0,00') + '</span></div>'
                        + '</div>';
                }
                var listaEl = document.getElementById('lista-rotas-editavel');
                if (listaEl && dados.rotas && dados.rotas.length) {
                    listaEl.innerHTML = dados.rotas.map(function (r, i) {
                        var cor = CORES[(r.numero ? r.numero - 1 : i) % CORES.length];
                        return '<div class="d-flex align-items-start gap-2 p-2 border-bottom"'
                            + ' style="border-left:4px solid ' + cor + ' !important;">'
                            + '<div class="flex-grow-1">'
                            + '<div class="fw-semibold small text-dark">'
                            + '<i class="bi bi-geo-alt-fill me-1" style="color:' + cor + '"></i>Rota ' + (r.numero || i + 1) + '</div>'
                            + '<div class="text-muted" style="font-size:.78rem;">'
                            + '<b>De:</b> ' + (r.origem || r.de) + '<br><b>Para:</b> ' + (r.destino || r.para) + '</div>'
                            + '</div></div>';
                    }).join('');
                }
                carregarLeaflet().then(function () { _renderizarMapaComCoordenadas(); });
            }, { once: true });
            modalMapa.show();
        });
    }

    window.preencherDadosMapa = function (nome) {
        var el = document.getElementById('header-nome-solicitante');
        if (el) el.textContent = nome || 'Não identificado';
    };

    window.iniciarFluxoCheckout = function () {
        var msgInput = document.getElementById('msg-input');
        var texto = msgInput ? (msgInput.value || '').trim() : '';
        if (!texto) { if (typeof window.marcarCampoInvalido === 'function') window.marcarCampoInvalido(); return; }

        var solicitante = ((texto.match(/(?:SOLICITANTE|NOME|CLIENTE)\s*:\s*(.*)/i) || [])[1] || 'Não informado').trim();
        var contato     = ((texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE)\s*:\s*([\d\s\-\(\)\+]+)/i) || [])[1] || '').trim();
        var rotas       = parsearRotas(texto);

        if (rotas.length === 0) {
            if (typeof window.exibirModalValidacao === 'function') {
                window.exibirModalValidacao('Nenhuma rota encontrada.<br>Use o formato: <strong>De: Origem | Para: Destino</strong>');
            }
            return;
        }

        window.loadModal('mapa_clientes.html').then(function (carregou) {
            if (!carregou) return;
            var modalEl = document.getElementById('modalMapa');
            if (!modalEl) return;
            var inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) { try { inst.dispose(); } catch (e) {} }
            var modalMapa = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

            modalEl.addEventListener('shown.bs.modal', function () {
                var elHeader    = document.getElementById('header-nome-solicitante');
                var footerEl    = document.getElementById('footer-resumo-dados');
                var listaEl     = document.getElementById('lista-rotas-editavel');
                var loaderEl    = document.getElementById('mapa-loader');
                var containerMapa = document.getElementById('container-mapa-visual');

                if (elHeader) elHeader.innerText = solicitante;

                if (listaEl) {
                    listaEl.innerHTML = rotas.map(function (r, i) {
                        return '<div class="d-flex align-items-start gap-2 p-2 border-bottom"'
                            + ' style="border-left:4px solid ' + r.cor + ' !important;">'
                            + '<div class="flex-grow-1">'
                            + '<div class="fw-semibold small text-dark">'
                            + '<i class="bi bi-geo-alt-fill me-1" style="color:' + r.cor + '"></i>Rota ' + r.numero + '</div>'
                            + '<div class="text-muted" style="font-size:.78rem;">'
                            + '<b>De:</b> ' + r.origem + '<br><b>Para:</b> ' + r.destino + '</div>'
                            + '</div></div>';
                    }).join('');
                }

                if (footerEl) footerEl.innerHTML = '<span class="text-muted small"><i class="bi bi-hourglass-split me-1"></i>Calculando rotas...</span>';

                if (loaderEl) {
                    loaderEl.innerHTML =
                        '<div class="spinner-border spinner-border-sm text-danger opacity-50"></div>'
                        + '<div class="mt-2 fin-loading-text">Calculando rotas<span class="fin-dots"></span></div>';
                    loaderEl.style.display = '';
                }
                if (containerMapa) containerMapa.style.display = 'none';

                carregarLeaflet().then(async function () {
                    if (typeof L === 'undefined') return;

                    var totalKm      = 0;
                    var totalMin     = 0;
                    var coordenadas  = [];
                    var rotasResult  = [];

                    for (var i = 0; i < rotas.length; i++) {
                        var r = rotas[i];
                        if (i > 0) await esperar(1100);
                        var origGeo = await geocodificar(r.origem);
                        await esperar(1100);
                        var destGeo = await geocodificar(r.destino);
                        if (!origGeo || !destGeo) continue;
                        var res = await rotaOSRM(origGeo, destGeo);
                        if (!res) continue;
                        totalKm  += parseFloat(res.km);
                        totalMin += res.min;
                        coordenadas.push(res.caminho);
                        rotasResult.push({ numero: r.numero, origem: r.origem, destino: r.destino, cor: r.cor, km: res.km, min: res.min });
                    }

                    var kmArredondado = Math.round(totalKm);

                    window.dadosPedidoAtual = {
                        solicitante:  solicitante,
                        contato:      contato,
                        cliente:      (window.AppRDO ? window.AppRDO.clienteSelecionado : null)
                                      || localStorage.getItem('clienteSelecionadoNome') || 'N/A',
                        distancia:    kmArredondado.toString(),
                        tempo:        formatarTempo(totalMin),
                        coordenadas:  coordenadas,
                        rotas:        rotasResult,
                        valor:        (kmArredondado * VALOR_POR_KM).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                        rawInput:     texto,
                        chatId:       (window.AppRDO ? window.AppRDO.clienteId : null) || null,
                        clienteId:    (window.AppRDO ? window.AppRDO.clienteId : null) || null
                    };

                    if (loaderEl) loaderEl.style.display = 'none';

                    if (footerEl) {
                        footerEl.innerHTML =
                            '<div class="d-flex align-items-center gap-3 flex-wrap">'
                            + '<div class="d-flex align-items-center gap-1">'
                            + '<i class="bi bi-signpost-split-fill text-danger fs-6"></i>'
                            + '<span class="fw-bold text-dark">' + kmArredondado + ' km</span></div>'
                            + '<div class="vr" style="height:20px;"></div>'
                            + '<div class="d-flex align-items-center gap-1">'
                            + '<i class="bi bi-clock-fill text-primary fs-6"></i>'
                            + '<span class="fw-bold text-dark">' + formatarTempo(totalMin) + '</span></div>'
                            + '<div class="vr" style="height:20px;"></div>'
                            + '<div class="d-flex align-items-center gap-1">'
                            + '<i class="bi bi-cash-stack text-success fs-6"></i>'
                            + '<span class="fw-bold text-dark">'
                            + (kmArredondado * VALOR_POR_KM).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            + '</span></div>'
                            + '</div>';
                    }

                    if (listaEl && rotasResult.length) {
                        listaEl.innerHTML = rotasResult.map(function (r) {
                            return _itemOk(r, r);
                        }).join('');
                    }

                    _renderizarMapaComCoordenadas();
                });

            }, { once: true });

            modalMapa.show();
        });
    };

    window.prosseguirParaFormulario = function () {
        var modalMapaEl = document.getElementById('modalMapa');
        if (modalMapaEl) {
            var inst = bootstrap.Modal.getInstance(modalMapaEl);
            if (inst) {
                modalMapaEl.addEventListener('hidden.bs.modal', function handler() {
                    modalMapaEl.removeEventListener('hidden.bs.modal', handler);
                    _abrirModalForm();
                }, { once: true });
                inst.hide();
                return;
            }
        }
        _abrirModalForm();
    };

    window.voltarParaMapa = function () {
        var modalFormEl = document.getElementById('modalFormulario');
        if (modalFormEl) {
            var inst = bootstrap.Modal.getInstance(modalFormEl);
            if (inst) {
                modalFormEl.addEventListener('hidden.bs.modal', function handler() {
                    modalFormEl.removeEventListener('hidden.bs.modal', handler);
                    _abrirModalMapa();
                }, { once: true });
                inst.hide();
                return;
            }
        }
        _abrirModalMapa();
    };

    window.abrirModalMapa = _abrirModalMapa;

})();
