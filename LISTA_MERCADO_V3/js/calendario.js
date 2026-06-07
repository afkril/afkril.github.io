// ==================== CALENDARIO FESTIVOS ====================
        function initCalendar() {
            const nav = document.getElementById('calendarNav');
            nombresMeses.forEach((mes, idx) => {
                const btn = document.createElement('button');
                btn.className = 'month-btn' + (idx === currentMonth ? ' active' : '');
                btn.textContent = mes.substring(0, 3);
                btn.onclick = () => {
                    document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentMonth = idx;
                    renderCalendar(idx);
                };
                nav.appendChild(btn);
            });
            renderCalendar(currentMonth);
        }

        function renderCalendar(month) {
            const grid = document.getElementById('calendarGrid');
            grid.innerHTML = '';
            
            // Headers de dias
            nombresDias.forEach(dia => {
                const header = document.createElement('div');
                header.className = 'calendar-day-header';
                header.textContent = dia;
                grid.appendChild(header);
            });
            
            const year = 2026;
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const prevMonthDays = new Date(year, month, 0).getDate();
            
            // Dias del mes anterior
            for (let i = firstDay - 1; i >= 0; i--) {
                const day = document.createElement('div');
                day.className = 'calendar-day other-month';
                day.textContent = prevMonthDays - i;
                grid.appendChild(day);
            }
            
            // Dias del mes actual
            const today = new Date();
            const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
            
            for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
                const day = document.createElement('div');
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayOfWeek = new Date(year, month, dayNum).getDay();
                const festivo = festivos2026.find(f => f.fecha === dateStr);
                
                day.className = 'calendar-day';
                day.textContent = dayNum;
                
                if (dayOfWeek === 0 || dayOfWeek === 6) day.classList.add('weekend');
                if (festivo) {
                    day.classList.add('holiday');
                    day.setAttribute('data-holiday', festivo.nombre);
                    day.title = festivo.nombre;
                }
                if (isCurrentMonth && dayNum === today.getDate()) day.classList.add('today');
                
                grid.appendChild(day);
            }
            
            // Dias del mes siguiente
            const remainingCells = 42 - (firstDay + daysInMonth);
            for (let i = 1; i <= remainingCells; i++) {
                const day = document.createElement('div');
                day.className = 'calendar-day other-month';
                day.textContent = i;
                grid.appendChild(day);
            }
        }

