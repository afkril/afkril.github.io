        // ===== FUNCIONES DEL TUTORIAL =====

        function toggleHelpMenu() {
            const menu = document.getElementById('helpMenu');
            menu.classList.toggle('active');
            
            if (menu.classList.contains('active')) {
                setTimeout(() => {
                    document.addEventListener('click', cerrarHelpMenu);
                }, 100);
            }
        }

        function cerrarHelpMenu(e) {
            const menu = document.getElementById('helpMenu');
            const btn = document.getElementById('helpButton');
            
            if (!menu.contains(e.target) && !btn.contains(e.target)) {
                menu.classList.remove('active');
                document.removeEventListener('click', cerrarHelpMenu);
            }
        }

        function abrirSidebarParaTutorial() {
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth > 768) {
                sidebar.classList.remove('collapsed');
                sidebarOpen = true;
            } else {
                sidebar.classList.add('open');
                sidebarOpen = true;
            }
        }

        function startTutorial(tipo = 'completo') {
            document.getElementById('helpMenu').classList.remove('active');
            tutorialEnCurso = true;
            abrirSidebarParaTutorial();
            
            if (!TUTORIAL_STEPS[tipo]) {
                console.error('Tutorial no encontrado:', tipo);
                return;
            }
            
            tutorialActivo = TUTORIAL_STEPS[tipo];
            pasoActual = 0;
            
            document.getElementById('tutorialOverlay').classList.add('active');
            generarProgreso();
            mostrarPaso(0);
            document.getElementById('helpButton').classList.remove('pulse');
        }

        function generarProgreso() {
            const cont = document.getElementById('tutorialProgress');
            cont.innerHTML = tutorialActivo.map((_, i) => 
                `<div class="tutorial-dot ${i === 0 ? 'active' : ''}" data-step="${i}"></div>`
            ).join('');
        }

        function mostrarPaso(index) {
            if (index < 0 || index >= tutorialActivo.length) return;
            
            pasoActual = index;
            const paso = tutorialActivo[index];
            
            if (paso.target && (
                paso.target.includes('nav-') || 
                paso.target === 'sidebar' ||
                paso.target.includes('sidebar')
            )) {
                abrirSidebarParaTutorial();
            }
            
            document.getElementById('tutorialIcon').innerHTML = `<i class="fa-solid ${paso.icon || 'fa-circle-info'}"></i>`;
            document.getElementById('tutorialTitle').textContent = paso.title;
            document.getElementById('tutorialStep').textContent = `${index + 1}/${tutorialActivo.length}`;
            document.getElementById('tutorialContent').innerHTML = paso.content;
            
            const tipEl = document.getElementById('tutorialTip');
            if (paso.tip) {
                document.getElementById('tutorialTipText').textContent = paso.tip;
                tipEl.style.display = 'block';
            } else {
                tipEl.style.display = 'none';
            }
            
            document.getElementById('btnPrev').style.visibility = index === 0 ? 'hidden' : 'visible';
            
            if (index === tutorialActivo.length - 1) {
                document.getElementById('btnNext').classList.add('hidden');
                document.getElementById('btnFinish').classList.remove('hidden');
                document.getElementById('btnSkip').style.visibility = 'hidden';
            } else {
                document.getElementById('btnNext').classList.remove('hidden');
                document.getElementById('btnFinish').classList.add('hidden');
                document.getElementById('btnSkip').style.visibility = 'visible';
            }
            
            document.querySelectorAll('.tutorial-dot').forEach((dot, i) => {
                dot.classList.remove('active', 'completed');
                if (i < index) dot.classList.add('completed');
                if (i === index) dot.classList.add('active');
            });
            
            posicionarTooltip(paso);
            
            if (paso.action) {
                setTimeout(() => paso.action(), 300);
            }
        }

        function posicionarTooltip(paso) {
            const tooltip = document.getElementById('tutorialTooltip');
            const spotlight = document.getElementById('tutorialSpotlight');
            
            tooltip.className = 'tutorial-tooltip active';
            
            if (paso.position === 'center' || !paso.target) {
                tooltip.style.left = '50%';
                tooltip.style.top = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
                spotlight.style.display = 'none';
                return;
            }
            
            const target = document.getElementById(paso.target) || document.querySelector(paso.target);
            if (!target) {
                tooltip.style.left = '50%';
                tooltip.style.top = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
                return;
            }
            
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const rect = target.getBoundingClientRect();
            
            spotlight.style.display = 'block';
            spotlight.style.left = `${rect.left - 10}px`;
            spotlight.style.top = `${rect.top - 10}px`;
            spotlight.style.width = `${rect.width + 20}px`;
            spotlight.style.height = `${rect.height + 20}px`;
            
            const margin = 20;
            let left, top;
            
            // Ajustar posición para evitar que se corte
            const tooltipWidth = 350;
            const tooltipHeight = 400;
            
            switch(paso.position) {
                case 'bottom':
                    left = rect.left + rect.width / 2 - tooltipWidth / 2;
                    top = rect.bottom + margin;
                    tooltip.classList.add('top');
                    break;
                case 'top':
                    left = rect.left + rect.width / 2 - tooltipWidth / 2;
                    top = rect.top - tooltipHeight - margin;
                    tooltip.classList.add('bottom');
                    break;
                case 'left':
                    left = rect.left - tooltipWidth - margin;
                    top = rect.top + rect.height / 2 - tooltipHeight / 2;
                    tooltip.classList.add('right');
                    break;
                case 'right':
                    left = rect.right + margin;
                    top = rect.top + rect.height / 2 - tooltipHeight / 2;
                    tooltip.classList.add('left');
                    break;
                default:
                    left = rect.left + rect.width / 2 - tooltipWidth / 2;
                    top = rect.bottom + margin;
            }
            
            // Ajustar a límites de pantalla con margen de seguridad
            left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
            top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));
            
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.style.transform = 'none';
        }

        function tutorialNext() {
            if (pasoActual < tutorialActivo.length - 1) {
                mostrarPaso(pasoActual + 1);
            }
        }

        function tutorialPrev() {
            if (pasoActual > 0) {
                mostrarPaso(pasoActual - 1);
            }
        }

        function tutorialSkip() {
            zanConfirm({ title: 'Saltar tutorial', msg: 'Puedes volver a verlo desde el botón ? en cualquier momento.', tipo: 'info', okLabel: 'Saltar' }).then(ok => {
                if (ok) {
                    tutorialEnCurso = false;
                    marcarTutorialVisto();
                    tutorialFinish();
                }
            });
        }

        function tutorialFinish() {
            document.getElementById('tutorialOverlay').classList.remove('active');
            document.getElementById('tutorialTooltip').classList.remove('active');
            document.getElementById('tutorialSpotlight').style.display = 'none';
            
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
            document.getElementById('overlay').style.display = 'none';
            
            tutorialEnCurso = false;
            cerrarSidebarSiAbierto();
            marcarTutorialVisto();
            document.getElementById('helpButton').classList.add('pulse');
        }
		
		// ===== DETECCIÓN DE CONEXIÓN =====
		function estaOnline() {
			return navigator.onLine;
		}

		function iniciarMonitoreoConexion() {
			window.addEventListener('online', () => {
				console.log("🌐 Conexión restablecida");
				mostrarNotificacionConexionRestablecida();
			});
			
			window.addEventListener('offline', () => {
				console.log("📴 Sin conexión");
				mostrarNotificacionSinConexion();
			});
		}

		function mostrarNotificacionSinConexion() {
			const dotTop = document.getElementById('sync-dot-top');
			const textTop = document.getElementById('sync-text-top');
			const dot = document.getElementById('sync-dot');
			const text = document.getElementById('sync-text');
			
			if (dotTop) {
				dotTop.style.background = '#d4af37'; // Dorado
				dotTop.style.boxShadow = '0 0 8px #d4af37';
			}
			if (textTop) {
				textTop.textContent = "Sin conexión";
				textTop.style.color = '#d4af37';
			}
			if (dot) {
				dot.style.background = '#d4af37';
				dot.style.boxShadow = '0 0 5px #d4af37';
			}
			if (text) {
				text.textContent = "Sin conexión";
			}
		}

		function mostrarNotificacionConexionRestablecida() {
			// Solo mostrar diálogo si hay datos pendientes
			if (hayPendientesSinSincronizar && ultimoGuardadoLocal) {
				const contrato = ultimoGuardadoLocal.contrato || "Sin contrato";
				const mes = ultimoGuardadoLocal.mes || "Sin mes";
				
				zanConfirm({ title: '🌐 Conexión restablecida', msg: `¿Sincronizar ahora el contrato?\n📄 ${contrato}  📅 ${mes}`, tipo: 'info', okLabel: 'Sincronizar' }).then(ok => { if (ok) sincronizarPendientes(); });
			} else {
				// Solo actualizar indicador visual
				marcarSincronizado();
			}
		}
		
		

