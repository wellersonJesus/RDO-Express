(function () {
    'use strict';

    var CORES = ['#4285F4', '#EA4335', '#34A853', '#FBBC04', '#9C27B0', '#FF6D00'];

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
                        origem: origem,
                        destino: destino,
                        cor: CORES[(idx - 1) % CORES.length]
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
        var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + encodeURIComponent(busca);
        return fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.length > 0) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
                return null;
            })
            .catch(function () { return null; });
    }

    function rotaOSRM(orig, dest) {
        var url = 'https://router.project-osrm.org/route/v1/driving/' +
            orig.lng + ',' + orig.lat + ';' + dest.lng + ',' + dest.lat +
            '?overview=full&geometries=geojson&steps=false';
        return fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.code === 'Ok' && d.routes && d.routes.length > 0) {
                    var rt = d.routes[0];
                    return {
                        km: (rt.distance / 1000).toFixed(1),
                        min: Math.round(rt.duration / 60),
                        caminho: rt.geometry.coordinates.map(function (c) { return [c[1], c[0]]; })
                    };
                }
                return null;
            })
            .catch(function () { return null; });
    }

    function esperar(ms) {
        return new Promise(function (ok) { setTimeout(ok, ms); });
    }

    function moeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatarTempo(minutos) {
        var min = parseInt(minutos, 10);
        if (!min || min <= 0) return '0 min';
        if (min < 60) return min + ' min';
        var h = Math.floor(min / 60);
        var mn = min % 60;
        return h + 'h' + (mn > 0 ? ' ' + mn + 'min' : '');
    }

    function carregarLeaflet() {
        return new Promise(function (resolve) {
            if (typeof L !== 'undefined') { resolve(); return; }
            if (!document.getElementById('leaflet-css-rdo')) {
                var link = document.createElement('link');
                link.id = 'leaflet-css-rdo';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }
            if (document.querySelector('script[src*="leaflet@1.9.4/dist/leaflet.js"]')) {
                var check = setInterval(function () {
                    if (typeof L !== 'undefined') { clearInterval(check); resolve(); }
                }, 100);
                return;
            }
            var s = document.createElement('script');
            s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.onload = function () { resolve(); };
            s.onerror = function () { resolve(); };
            document.body.appendChild(s);
        });
    }

    function _renderizarMapa(coordenadas) {
        var container = document.getElementById('container-mapa-visual');
        if (!container) return;

        if (window._leafletMapInstance) {
            try { window._leafletMapInstance.remove(); } catch (_) {}
            window._leafletMapInstance = null;
        }

        container.innerHTML = '';
        container.style.display = 'block';
        if (!container.style.height || container.style.height === '0px') {
            container.style.height = '400px';
        }

        if (!coordenadas || coordenadas.length === 0) return;
        if (typeof L === 'undefined') return;

        var mapa = L.map(container, { zoomControl: true, scrollWheelZoom: true })
            .setView([-19.9191, -43.9386], 12);
        window._leafletMapInstance = mapa;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19
        }).addTo(mapa);

        var criarIcone = function (emoji) {
            return L.divIcon({
                html: '<div style="font-size:24px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));">' + emoji + '</div>',
                className: 'custom-div-icon',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
        };

        var todosOsPontos = [];
        coordenadas.forEach(function (caminho, i) {
            if (!caminho || caminho.length === 0) return;

            L.polyline(caminho, {
                color: CORES[i % CORES.length],
                weight: 5,
                opacity: 0.8,
                dashArray: '10, 8',
                lineCap: 'round',
                lineJoin: 'round',
                smoothFactor: 2
            }).addTo(mapa);

            if (i === 0) {
                L.marker(caminho[0], { icon: criarIcone('🏁') }).addTo(mapa).bindPopup('<strong>Origem</strong>');
            }
            if (i === coordenadas.length - 1) {
                L.marker(caminho[caminho.length - 1], { icon: criarIcone('📍') }).addTo(mapa).bindPopup('<strong>Destino Final</strong>');
            } else {
                L.marker(caminho[caminho.length - 1], { icon: criarIcone('🔄') }).addTo(mapa).bindPopup('<strong>Parada ' + (i + 1) + '</strong>');
            }
            caminho.forEach(function (p) { todosOsPontos.push(p); });
        });

        if (todosOsPontos.length > 0) {
            mapa.fitBounds(L.latLngBounds(todosOsPontos).pad(0.15));
        }
        setTimeout(function () { mapa.invalidateSize(); }, 400);
    }

    function _renderizarResumo(km, min, valor) {
        var footerEl = document.getElementById('footer-resumo-dados');
        if (!footerEl) return;

        footerEl.innerHTML =
            '<div class="d-flex align-items-center justify-content-center gap-4 py-3">' +
            '<div class="d-flex align-items-center gap-2">' +
            '<i class="bi bi-signpost-split-fill text-danger" style="font-size:1.5rem;"></i>' +
            '<div><div class="small text-muted mb-1">Distância</div>' +
            '<div class="fw-bold text-dark fs-5">' + km + ' km</div></div></div>' +
            '<div class="vr" style="height:50px;opacity:0.3;"></div>' +
            '<div class="d-flex align-items-center gap-2">' +
            '<i class="bi bi-clock-fill text-primary" style="font-size:1.5rem;"></i>' +
            '<div><div class="small text-muted mb-1">Tempo</div>' +
            '<div class="fw-bold text-dark fs-5">' + formatarTempo(min) + '</div></div></div>' +
            '<div class="vr" style="height:50px;opacity:0.3;"></div>' +
            '<div class="d-flex align-items-center gap-2">' +
            '<i class="bi bi-cash-stack text-success" style="font-size:1.5rem;"></i>' +
            '<div><div class="small text-muted mb-1">Valor</div>' +
            '<div class="fw-bold text-success" style="font-size:1.8rem;">' + moeda(valor) + '</div></div></div>' +
            '</div>';
    }

    window.iniciarFluxoCheckout = function () {
        console.log('[mapa_clientes.js] 🚀 iniciarFluxoCheckout()');

        var msgInput = document.getElementById('msg-input');
        var texto = msgInput ? (msgInput.value || '').trim() : '';
        
        if (!texto) {
            if (typeof window.marcarCampoInvalido === 'function') window.marcarCampoInvalido();
            return;
        }

        var solicitante = ((texto.match(/(?:SOLICITANTE|NOME|CLIENTE)\s*:\s*(.*)/i) || [])[1] || 'Não informado').trim();
        
        var contatoMatch = texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE)\s*:\s*([^\n]+)/i);
        var contatoCompleto = contatoMatch ? contatoMatch[1].trim() : '';
        
        var contato = contatoCompleto.split('|')[0].trim();
        var horario = '';
        
        if (contatoCompleto.includes('|')) {
            var partes = contatoCompleto.split('|');
            for (var i = 1; i < partes.length; i++) {
                var hrMatch = partes[i].match(/(?:HR|HORÁRIO|HORARIO)\s*:\s*(.+)/i);
                if (hrMatch) {
                    horario = hrMatch[1].trim();
                    break;
                }
            }
        }

        if (!horario) {
            var hrLinhaMatch = texto.match(/(?:HORÁRIO ESTIMADO|HORARIO ESTIMADO|HR)\s*:\s*([^\n]+)/i);
            if (hrLinhaMatch) horario = hrLinhaMatch[1].trim();
        }

        console.log('[mapa_clientes.js] 📞 Contato:', contato, '| ⏰ Horário:', horario);

        var rotas = parsearRotas(texto);

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
            if (inst) { try { inst.dispose(); } catch (_) {} }

            var modalMapa = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

            modalEl.addEventListener('shown.bs.modal', function () {
                var elHeader = document.getElementById('header-nome-solicitante');
                var footerEl = document.getElementById('footer-resumo-dados');
                var loaderEl = document.getElementById('mapa-loader');
                var containerMapa = document.getElementById('container-mapa-visual');

                if (elHeader) elHeader.innerText = solicitante;
                if (footerEl) footerEl.innerHTML = '<div class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm text-danger me-2"></div>Calculando rotas...</div>';
                if (loaderEl) loaderEl.style.display = 'flex';
                if (containerMapa) containerMapa.style.display = 'none';

                carregarLeaflet().then(async function () {
                    if (typeof L === 'undefined') return;

                    var totalKm = 0;
                    var totalMin = 0;
                    var coordenadas = [];
                    var rotasProcessadas = [];

                    for (var i = 0; i < rotas.length; i++) {
                        var r = rotas[i];
                        if (i > 0) await esperar(1100);

                        var origGeo = await geocodificar(r.origem);
                        await esperar(1100);
                        var destGeo = await geocodificar(r.destino);

                        if (!origGeo || !destGeo) {
                            console.warn('[mapa_clientes.js] ⚠️ Rota', r.numero, 'sem coordenadas');
                            continue;
                        }

                        var res = await rotaOSRM(origGeo, destGeo);
                        if (!res) {
                            console.warn('[mapa_clientes.js] ⚠️ Rota', r.numero, 'sem resultado OSRM');
                            continue;
                        }

                        totalKm += parseFloat(res.km);
                        totalMin += parseInt(res.min, 10);
                        coordenadas.push(res.caminho);
                        
                        rotasProcessadas.push({
                            numero: r.numero,
                            de: r.origem,
                            para: r.destino,
                            km: res.km,
                            min: res.min
                        });

                        console.log('[mapa_clientes.js] ✅ Rota', r.numero, ':', res.km, 'km |', res.min, 'min');
                    }

                    var valorTotal = totalKm * 3.00;

                    window.dadosPedidoAtual = {
                        cliente_nome: solicitante,
                        cliente_telefone: contato,
                        solicitante: solicitante,
                        contato: contato,
                        horario: horario,
                        distanciaTotal: totalKm,
                        tempoTotal: totalMin,
                        tempo: formatarTempo(totalMin),
                        coordenadas: coordenadas,
                        rotasProcessadas: rotasProcessadas,
                        valor: moeda(valorTotal),
                        valorNumerico: valorTotal,
                        texto: texto,
                        rawInput: texto,
                        clienteId: (window.AppRDO ? window.AppRDO.clienteId : null) || null
                    };

                    console.log('[mapa_clientes.js] 📊 Total:', totalKm.toFixed(1), 'km |', totalMin, 'min |', moeda(valorTotal));
                    console.log('[mapa_clientes.js] 💾 dadosPedidoAtual salvo:', window.dadosPedidoAtual);

                    if (loaderEl) loaderEl.style.display = 'none';
                    if (containerMapa) containerMapa.style.display = 'block';

                    _renderizarMapa(coordenadas);
                    _renderizarResumo(totalKm.toFixed(1), totalMin, valorTotal);
                });

            }, { once: true });

            modalMapa.show();
        });
    };

    window.prosseguirParaFormulario = function () {
        console.log('[mapa_clientes.js] ➡️ prosseguirParaFormulario()');

        var modalMapaEl = document.getElementById('modalMapa');
        if (modalMapaEl) {
            var inst = bootstrap.Modal.getInstance(modalMapaEl);
            if (inst) {
                modalMapaEl.addEventListener('hidden.bs.modal', function () {
                    _abrirModalForm();
                }, { once: true });
                inst.hide();
                return;
            }
        }
        _abrirModalForm();
    };

    function _abrirModalForm() {
        console.log('[mapa_clientes.js] 📝 _abrirModalForm()');

        window.loadModal('form_clientes.html').then(function (carregou) {
            if (!carregou) {
                console.error('[mapa_clientes.js] ❌ Erro ao carregar formulário');
                return;
            }

            var modalEl = document.getElementById('modalFormulario');
            if (!modalEl) {
                console.error('[mapa_clientes.js] ❌ Modal formulário não encontrado');
                return;
            }
            
            var inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) { try { inst.dispose(); } catch (_) {} }
            
            var modalForm = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
            
            modalEl.addEventListener('shown.bs.modal', function () {
                console.log('[mapa_clientes.js] 📝 Modal formulário aberto');
                
                if (typeof window._preencherFormulario === 'function') {
                    window._preencherFormulario(window.dadosPedidoAtual);
                } else {
                    console.error('[mapa_clientes.js] ❌ _preencherFormulario não definido');
                }
            }, { once: true });
            
            modalForm.show();
        });
    }

    window.voltarParaMapa = function () {
        console.log('[mapa_clientes.js] ⬅️ voltarParaMapa()');
        
        var modalFormEl = document.getElementById('modalFormulario');
        if (modalFormEl) {
            var inst = bootstrap.Modal.getInstance(modalFormEl);
            if (inst) inst.hide();
        }
    };

})();

window.fecharParaChat = function (modalId) {
    console.log('[fecharParaChat] Fechando modal:', modalId);
    
    var modalEl = document.getElementById(modalId);
    if (!modalEl) return;
    
    var inst = bootstrap.Modal.getInstance(modalEl);
    if (inst) {
        modalEl.addEventListener('hidden.bs.modal', function () {
            window.dadosPedidoAtual = null;

            if (window._leafletMapInstance) {
                try { window._leafletMapInstance.remove(); } catch (_) {}
                window._leafletMapInstance = null;
            }

            var msgInput = document.getElementById('msg-input');
            if (msgInput) {
                msgInput.value = '';
                msgInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            var btnEnviar = document.getElementById('btn-enviar');
            if (btnEnviar) btnEnviar.disabled = false;

        }, { once: true });
        inst.hide();
    }
};

console.log('[mapa_clientes.js] ✅ Script carregado');
