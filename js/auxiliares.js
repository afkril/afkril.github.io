        // ==================== FUNCIONES AUXILIARES ====================
        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = 'toast';
            if (type === 'error') toast.style.borderLeftColor = 'var(--danger)';
            if (type === 'warning') toast.style.borderLeftColor = 'var(--warning)';
            
            const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
            toast.innerHTML = `<span>${icons[type]}</span> ${message}`;
            
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        function updateSavedCount() {
            document.getElementById('savedCount').textContent = savedLists.length;
        }

