// ============================================================
// NUTRICIONAL.JS — Cálculo OMS (Z-scores), modal de gráfica de
// crecimiento, y toda la sección "Análisis Nutricional"
// ============================================================

function toggleNutricionPendiente() {
            const checkbox = document.getElementById('nutricionPendiente');
            const wrapper = document.getElementById('nutricionFieldsWrapper');
            const indicator = document.getElementById('nutricionIndicator');
            if (!checkbox || !wrapper) return;
            const isPendiente = checkbox.checked;
            wrapper.style.display = isPendiente ? 'none' : '';
            if (indicator) indicator.style.display = isPendiente ? 'none' : '';
        }

const OMS_LMS_DATA = {
			// ============================================
			// TABLAS OFICIALES OMS 2006 - PESO/TALLA (2-5 años)
			// Parámetros LMS oficiales (L=Box-Cox power, M=mediana, S=coef. variación)
			// Fuente: WHO Child Growth Standards - Weight-for-height, BOYS/GIRLS 2 to 5 years (z-scores)
			// https://www.who.int/tools/child-growth-standards/standards/weight-for-length-height
			// Mismo estándar que usa el sistema Cuéntame del ICBF (Resolución MinSalud 2465/2016)
			// Resolución de talla: 0.5 cm (65.0 a 120.0 cm)
			// ============================================
			boys: {
				L: -0.3521,
		data: {
			'65.0': {M: 7.4327, S: 0.08217},
			'65.5': {M: 7.5504, S: 0.08214},
			'66.0': {M: 7.6673, S: 0.08212},
			'66.5': {M: 7.7834, S: 0.08212},
			'67.0': {M: 7.8986, S: 0.08213},
			'67.5': {M: 8.0132, S: 0.08214},
			'68.0': {M: 8.1272, S: 0.08217},
			'68.5': {M: 8.2410, S: 0.08221},
			'69.0': {M: 8.3547, S: 0.08226},
			'69.5': {M: 8.4680, S: 0.08231},
			'70.0': {M: 8.5808, S: 0.08237},
			'70.5': {M: 8.6927, S: 0.08243},
			'71.0': {M: 8.8036, S: 0.08250},
			'71.5': {M: 8.9135, S: 0.08257},
			'72.0': {M: 9.0221, S: 0.08264},
			'72.5': {M: 9.1292, S: 0.08272},
			'73.0': {M: 9.2347, S: 0.08278},
			'73.5': {M: 9.3390, S: 0.08285},
			'74.0': {M: 9.4420, S: 0.08292},
			'74.5': {M: 9.5438, S: 0.08298},
			'75.0': {M: 9.6440, S: 0.08303},
			'75.5': {M: 9.7425, S: 0.08308},
			'76.0': {M: 9.8392, S: 0.08312},
			'76.5': {M: 9.9341, S: 0.08315},
			'77.0': {M: 10.0274, S: 0.08317},
			'77.5': {M: 10.1194, S: 0.08318},
			'78.0': {M: 10.2105, S: 0.08317},
			'78.5': {M: 10.3012, S: 0.08315},
			'79.0': {M: 10.3923, S: 0.08311},
			'79.5': {M: 10.4845, S: 0.08305},
			'80.0': {M: 10.5781, S: 0.08298},
			'80.5': {M: 10.6737, S: 0.08290},
			'81.0': {M: 10.7718, S: 0.08279},
			'81.5': {M: 10.8728, S: 0.08268},
			'82.0': {M: 10.9772, S: 0.08255},
			'82.5': {M: 11.0851, S: 0.08241},
			'83.0': {M: 11.1966, S: 0.08225},
			'83.5': {M: 11.3114, S: 0.08209},
			'84.0': {M: 11.4290, S: 0.08191},
			'84.5': {M: 11.5490, S: 0.08174},
			'85.0': {M: 11.6707, S: 0.08156},
			'85.5': {M: 11.7937, S: 0.08138},
			'86.0': {M: 11.9173, S: 0.08121},
			'86.5': {M: 12.0411, S: 0.08105},
			'87.0': {M: 12.1645, S: 0.08090},
			'87.5': {M: 12.2871, S: 0.08076},
			'88.0': {M: 12.4089, S: 0.08064},
			'88.5': {M: 12.5298, S: 0.08054},
			'89.0': {M: 12.6495, S: 0.08045},
			'89.5': {M: 12.7683, S: 0.08038},
			'90.0': {M: 12.8864, S: 0.08032},
			'90.5': {M: 13.0038, S: 0.08028},
			'91.0': {M: 13.1209, S: 0.08025},
			'91.5': {M: 13.2376, S: 0.08024},
			'92.0': {M: 13.3541, S: 0.08025},
			'92.5': {M: 13.4705, S: 0.08027},
			'93.0': {M: 13.5870, S: 0.08031},
			'93.5': {M: 13.7041, S: 0.08036},
			'94.0': {M: 13.8217, S: 0.08043},
			'94.5': {M: 13.9403, S: 0.08051},
			'95.0': {M: 14.0600, S: 0.08060},
			'95.5': {M: 14.1811, S: 0.08071},
			'96.0': {M: 14.3037, S: 0.08083},
			'96.5': {M: 14.4282, S: 0.08097},
			'97.0': {M: 14.5547, S: 0.08112},
			'97.5': {M: 14.6832, S: 0.08129},
			'98.0': {M: 14.8140, S: 0.08146},
			'98.5': {M: 14.9468, S: 0.08165},
			'99.0': {M: 15.0818, S: 0.08185},
			'99.5': {M: 15.2187, S: 0.08206},
			'100.0': {M: 15.3576, S: 0.08229},
			'100.5': {M: 15.4985, S: 0.08252},
			'101.0': {M: 15.6412, S: 0.08277},
			'101.5': {M: 15.7857, S: 0.08302},
			'102.0': {M: 15.9320, S: 0.08328},
			'102.5': {M: 16.0801, S: 0.08354},
			'103.0': {M: 16.2298, S: 0.08381},
			'103.5': {M: 16.3812, S: 0.08408},
			'104.0': {M: 16.5342, S: 0.08436},
			'104.5': {M: 16.6889, S: 0.08464},
			'105.0': {M: 16.8454, S: 0.08493},
			'105.5': {M: 17.0036, S: 0.08521},
			'106.0': {M: 17.1637, S: 0.08551},
			'106.5': {M: 17.3256, S: 0.08580},
			'107.0': {M: 17.4894, S: 0.08611},
			'107.5': {M: 17.6550, S: 0.08641},
			'108.0': {M: 17.8226, S: 0.08673},
			'108.5': {M: 17.9924, S: 0.08704},
			'109.0': {M: 18.1645, S: 0.08736},
			'109.5': {M: 18.3390, S: 0.08768},
			'110.0': {M: 18.5158, S: 0.08800},
			'110.5': {M: 18.6948, S: 0.08832},
			'111.0': {M: 18.8759, S: 0.08864},
			'111.5': {M: 19.0590, S: 0.08896},
			'112.0': {M: 19.2439, S: 0.08928},
			'112.5': {M: 19.4304, S: 0.08960},
			'113.0': {M: 19.6185, S: 0.08991},
			'113.5': {M: 19.8081, S: 0.09022},
			'114.0': {M: 19.9990, S: 0.09054},
			'114.5': {M: 20.1912, S: 0.09085},
			'115.0': {M: 20.3846, S: 0.09116},
			'115.5': {M: 20.5789, S: 0.09147},
			'116.0': {M: 20.7741, S: 0.09177},
			'116.5': {M: 20.9700, S: 0.09208},
			'117.0': {M: 21.1666, S: 0.09239},
			'117.5': {M: 21.3636, S: 0.09270},
			'118.0': {M: 21.5611, S: 0.09300},
			'118.5': {M: 21.7588, S: 0.09331},
			'119.0': {M: 21.9568, S: 0.09362},
			'119.5': {M: 22.1549, S: 0.09393},
			'120.0': {M: 22.3530, S: 0.09424}
		}
			},
			girls: {
				L: -0.3833,
		data: {
			'65.0': {M: 7.2402, S: 0.09113},
			'65.5': {M: 7.3523, S: 0.09109},
			'66.0': {M: 7.4630, S: 0.09104},
			'66.5': {M: 7.5724, S: 0.09099},
			'67.0': {M: 7.6806, S: 0.09094},
			'67.5': {M: 7.7874, S: 0.09088},
			'68.0': {M: 7.8930, S: 0.09083},
			'68.5': {M: 7.9976, S: 0.09077},
			'69.0': {M: 8.1012, S: 0.09071},
			'69.5': {M: 8.2039, S: 0.09065},
			'70.0': {M: 8.3058, S: 0.09059},
			'70.5': {M: 8.4071, S: 0.09053},
			'71.0': {M: 8.5078, S: 0.09047},
			'71.5': {M: 8.6078, S: 0.09041},
			'72.0': {M: 8.7070, S: 0.09035},
			'72.5': {M: 8.8053, S: 0.09028},
			'73.0': {M: 8.9025, S: 0.09022},
			'73.5': {M: 8.9983, S: 0.09016},
			'74.0': {M: 9.0928, S: 0.09009},
			'74.5': {M: 9.1862, S: 0.09003},
			'75.0': {M: 9.2786, S: 0.08996},
			'75.5': {M: 9.3703, S: 0.08989},
			'76.0': {M: 9.4617, S: 0.08983},
			'76.5': {M: 9.5533, S: 0.08976},
			'77.0': {M: 9.6456, S: 0.08969},
			'77.5': {M: 9.7390, S: 0.08963},
			'78.0': {M: 9.8338, S: 0.08956},
			'78.5': {M: 9.9303, S: 0.08950},
			'79.0': {M: 10.0289, S: 0.08943},
			'79.5': {M: 10.1298, S: 0.08937},
			'80.0': {M: 10.2332, S: 0.08932},
			'80.5': {M: 10.3393, S: 0.08926},
			'81.0': {M: 10.4477, S: 0.08921},
			'81.5': {M: 10.5586, S: 0.08916},
			'82.0': {M: 10.6719, S: 0.08912},
			'82.5': {M: 10.7874, S: 0.08908},
			'83.0': {M: 10.9051, S: 0.08905},
			'83.5': {M: 11.0248, S: 0.08902},
			'84.0': {M: 11.1462, S: 0.08899},
			'84.5': {M: 11.2691, S: 0.08897},
			'85.0': {M: 11.3934, S: 0.08896},
			'85.5': {M: 11.5186, S: 0.08895},
			'86.0': {M: 11.6444, S: 0.08895},
			'86.5': {M: 11.7705, S: 0.08895},
			'87.0': {M: 11.8965, S: 0.08896},
			'87.5': {M: 12.0223, S: 0.08897},
			'88.0': {M: 12.1478, S: 0.08899},
			'88.5': {M: 12.2729, S: 0.08901},
			'89.0': {M: 12.3976, S: 0.08904},
			'89.5': {M: 12.5220, S: 0.08907},
			'90.0': {M: 12.6461, S: 0.08911},
			'90.5': {M: 12.7700, S: 0.08915},
			'91.0': {M: 12.8939, S: 0.08920},
			'91.5': {M: 13.0177, S: 0.08925},
			'92.0': {M: 13.1415, S: 0.08931},
			'92.5': {M: 13.2654, S: 0.08937},
			'93.0': {M: 13.3896, S: 0.08944},
			'93.5': {M: 13.5142, S: 0.08951},
			'94.0': {M: 13.6393, S: 0.08959},
			'94.5': {M: 13.7650, S: 0.08967},
			'95.0': {M: 13.8914, S: 0.08975},
			'95.5': {M: 14.0186, S: 0.08984},
			'96.0': {M: 14.1466, S: 0.08994},
			'96.5': {M: 14.2757, S: 0.09004},
			'97.0': {M: 14.4059, S: 0.09015},
			'97.5': {M: 14.5376, S: 0.09026},
			'98.0': {M: 14.6710, S: 0.09037},
			'98.5': {M: 14.8062, S: 0.09049},
			'99.0': {M: 14.9434, S: 0.09062},
			'99.5': {M: 15.0828, S: 0.09075},
			'100.0': {M: 15.2246, S: 0.09088},
			'100.5': {M: 15.3687, S: 0.09102},
			'101.0': {M: 15.5154, S: 0.09116},
			'101.5': {M: 15.6646, S: 0.09131},
			'102.0': {M: 15.8164, S: 0.09146},
			'102.5': {M: 15.9707, S: 0.09161},
			'103.0': {M: 16.1276, S: 0.09177},
			'103.5': {M: 16.2870, S: 0.09193},
			'104.0': {M: 16.4488, S: 0.09209},
			'104.5': {M: 16.6131, S: 0.09226},
			'105.0': {M: 16.7800, S: 0.09243},
			'105.5': {M: 16.9496, S: 0.09261},
			'106.0': {M: 17.1220, S: 0.09278},
			'106.5': {M: 17.2973, S: 0.09296},
			'107.0': {M: 17.4755, S: 0.09315},
			'107.5': {M: 17.6567, S: 0.09333},
			'108.0': {M: 17.8407, S: 0.09352},
			'108.5': {M: 18.0277, S: 0.09371},
			'109.0': {M: 18.2174, S: 0.09390},
			'109.5': {M: 18.4096, S: 0.09409},
			'110.0': {M: 18.6043, S: 0.09428},
			'110.5': {M: 18.8015, S: 0.09448},
			'111.0': {M: 19.0009, S: 0.09467},
			'111.5': {M: 19.2024, S: 0.09487},
			'112.0': {M: 19.4060, S: 0.09507},
			'112.5': {M: 19.6116, S: 0.09527},
			'113.0': {M: 19.8190, S: 0.09546},
			'113.5': {M: 20.0280, S: 0.09566},
			'114.0': {M: 20.2385, S: 0.09586},
			'114.5': {M: 20.4502, S: 0.09606},
			'115.0': {M: 20.6629, S: 0.09626},
			'115.5': {M: 20.8766, S: 0.09646},
			'116.0': {M: 21.0909, S: 0.09666},
			'116.5': {M: 21.3059, S: 0.09686},
			'117.0': {M: 21.5213, S: 0.09707},
			'117.5': {M: 21.7370, S: 0.09727},
			'118.0': {M: 21.9529, S: 0.09747},
			'118.5': {M: 22.1690, S: 0.09767},
			'119.0': {M: 22.3851, S: 0.09788},
			'119.5': {M: 22.6012, S: 0.09808},
			'120.0': {M: 22.8173, S: 0.09828}
		}
			}
		};

const OMS_TALLAS_LMS = (() => {
			const arr = [];
			for (let t = 65.0; t <= 120.0001; t += 0.5) arr.push(Math.round(t * 10) / 10);
			return arr;
		})();

function interpolarLMS(talla, genero) {
			const conj = genero === 'M' ? OMS_LMS_DATA.boys : OMS_LMS_DATA.girls;
			const L = conj.L;
			const tClamped = Math.min(Math.max(talla, 65.0), 120.0);

			let tLow = Math.floor(tClamped * 2) / 2;
			let tHigh = Math.ceil(tClamped * 2) / 2;
			const keyLow = tLow.toFixed(1);
			const keyHigh = tHigh.toFixed(1);

			if (keyLow === keyHigh) {
				const p = conj.data[keyLow];
				return { L, M: p.M, S: p.S };
			}

			const pLow = conj.data[keyLow];
			const pHigh = conj.data[keyHigh];
			const frac = (tClamped - tLow) / (tHigh - tLow);
			const M = pLow.M + (pHigh.M - pLow.M) * frac;
			const S = pLow.S + (pHigh.S - pLow.S) * frac;
			return { L, M, S };
		}

function calcularZScorePesoTalla(peso, talla, genero) {
			const { L, M, S } = interpolarLMS(talla, genero);
			if (Math.abs(L) < 1e-9) {
				return Math.log(peso / M) / S;
			}
			return (Math.pow(peso / M, L) - 1) / (L * S);
		}

function pesoParaZScore(z, talla, genero) {
			const { L, M, S } = interpolarLMS(talla, genero);
			if (Math.abs(L) < 1e-9) return M * Math.exp(S * z);
			return M * Math.pow(1 + L * S * z, 1 / L);
		}

function calcularZScore(peso, talla, genero, tipo = 'PT', edadMeses = null) {
			if (tipo !== 'PT') return null;
			if (talla == null || peso == null || isNaN(talla) || isNaN(peso)) return null;
			if (talla < 65 || talla > 120) return null;
			return calcularZScorePesoTalla(peso, talla, genero);
		}

const TALLA_REFERENCIA_EDAD = {
			boys: {
				// meses: [min, max] en cm aproximado para -2DE y +2DE
				0: [46, 54], 1: [50, 57], 2: [53, 60], 3: [55, 63], 6: [61, 69],
				9: [65, 74], 12: [69, 78], 15: [72, 82], 18: [75, 85], 24: [80, 91],
				30: [84, 96], 36: [88, 101], 42: [91, 105], 48: [94, 109], 54: [97, 113],
				60: [100, 117]
			},
			girls: {
				0: [45, 53], 1: [49, 56], 2: [52, 59], 3: [54, 62], 6: [60, 68],
				9: [64, 73], 12: [67, 77], 15: [71, 81], 18: [74, 84], 24: [78, 90],
				30: [83, 95], 36: [86, 100], 42: [90, 104], 48: [93, 108], 54: [96, 112],
				60: [99, 116]
			}
};

const DE_COLORS = [
				'#C0392B',  // -3DE (rojo oscuro)
				'#E74C3C',  // -2DE (rojo)
				'#F39C12',  // -1DE (naranja)
				'#27AE60',  // Mediana/0 (verde) - LÍNEA PRINCIPAL
				'#F1C40F',  // +1DE (amarillo)
				'#E67E22',  // +2DE (naranja oscuro)
				'#8E44AD'   // +3DE (púrpura)
			];

const DE_LABELS = ['-3DE', '-2DE', '-1DE', 'Mediana', '+1DE', '+2DE', '+3DE'];

const rangos = [
            
        ];

function calcularRangoOMS(talla, peso, genero, edadMeses = null) {
			
			if (talla < 65 || talla > 120) {
				console.warn(`Talla ${talla}cm fuera de rango 65-120cm (tablas 2-5 años)`);
				return { 
					nombre: 'Fuera de rango (2-5 años)', 
					de: 'N/A', 
					color: '#95A5A6', 
					clase: 'rango-sin-datos',
					mensaje: 'Las tablas OMS utilizadas son para niños de 2-5 años (65-120cm)'
				};
			}
		
			// ===== Validación de edad si se proporciona =====
			if (edadMeses !== null) {
				// Validar que la talla sea apropiada para la edad
				const tallaEsperadaMin = getTallaMinimaEsperada(edadMeses);
				const tallaEsperadaMax = getTallaMaximaEsperada(edadMeses);
				
				if (talla < tallaEsperadaMin || talla > tallaEsperadaMax) {
					console.warn(`⚠️ Talla ${talla}cm no corresponde a edad ${edadMeses} meses (rango esperado: ${tallaEsperadaMin}-${tallaEsperadaMax}cm)`);
					// Podrías retornar un estado especial o continuar con advertencia
				}
			}
			
			// Z-score EXACTO calculado con el método LMS oficial de la OMS
			// (mismo método/tablas que usa el sistema Cuéntame del ICBF)
			const de = calcularZScorePesoTalla(peso, talla, genero);
			
			// Determinar categoría según DE calculada
			if (de < -3) return { 
				nombre: 'Desnutrición Aguda Severa', 
				de: de.toFixed(2), 
				color: '#C0392B', 
				clase: 'rango-desnutricion-severa',
				alerta: 'ALTA - Requiere intervención inmediata'
			};
			if (de < -2) return { 
				nombre: 'Desnutrición Aguda Moderada', 
				de: de.toFixed(2), 
				color: '#E74C3C', 
				clase: 'rango-desnutricion-moderada',
				alerta: 'MODERADA - Requiere seguimiento cercano'
			};
			if (de < -1) return { 
				nombre: 'Riesgo de Desnutrición', 
				de: de.toFixed(2), 
				color: '#F39C12', 
				clase: 'rango-riesgo-desnutricion',
				alerta: 'PREVENTIVO - Monitoreo nutricional'
			};
			if (de < 1) return { 
				nombre: 'Peso Normal', 
				de: de.toFixed(2), 
				color: '#27AE60', 
				clase: 'rango-normal',
				alerta: 'ÓPTIMO - Mantener hábitos saludables'
			};
			if (de < 1.5) return { 
				nombre: 'Riesgo de Sobrepeso', 
				de: de.toFixed(2), 
				color: '#F1C40F', 
				clase: 'rango-riesgo-sobrepeso',
				alerta: 'PREVENTIVO - Vigilar alimentación'
			};
			if (de < 2) return { 
				nombre: 'Sobrepeso', 
				de: de.toFixed(2), 
				color: '#E67E22', 
				clase: 'rango-sobrepeso',
				alerta: 'ATENCIÓN - Ajustar dieta y actividad'
			};
			return { 
				nombre: 'Obesidad', 
				de: de.toFixed(2), 
				color: '#8E44AD', 
				clase: 'rango-obesidad',
				alerta: 'ALTA - Intervención nutricional necesaria'
			};
		}

function getTallaMinimaEsperada(edadMeses, genero = 'M') {
			const data = genero === 'M' ? TALLA_REFERENCIA_EDAD.boys : TALLA_REFERENCIA_EDAD.girls;
			// Encontrar el rango más cercano
			const mesesDisponibles = Object.keys(data).map(Number).sort((a, b) => a - b);
			let mesRef = mesesDisponibles[0];
			for (const m of mesesDisponibles) {
				if (Math.abs(edadMeses - m) < Math.abs(edadMeses - mesRef)) {
					mesRef = m;
				}
			}
			return data[mesRef][0];
		}

function getTallaMaximaEsperada(edadMeses, genero = 'M') {
			const data = genero === 'M' ? TALLA_REFERENCIA_EDAD.boys : TALLA_REFERENCIA_EDAD.girls;
			const mesesDisponibles = Object.keys(data).map(Number).sort((a, b) => a - b);
			let mesRef = mesesDisponibles[0];
			for (const m of mesesDisponibles) {
				if (Math.abs(edadMeses - m) < Math.abs(edadMeses - mesRef)) {
					mesRef = m;
				}
			}
			return data[mesRef][1];
		}

function parseEdadAMeses(edadString) {
			if (!edadString || edadString === 'Esperando fechas...') return null;
			
			const match = edadString.match(/(\d+)\s*años?\s*y\s*(\d+)\s*meses?/i);
			if (match) {
				const años = parseInt(match[1]);
				const meses = parseInt(match[2]);
				return (años * 12) + meses;
			}
			
			// Alternativa: solo meses
			const matchMeses = edadString.match(/(\d+)\s*meses?/i);
			if (matchMeses) {
				return parseInt(matchMeses[1]);
			}
			
			return null;
		}

function validarRangoNutricion(input, min, max) {
			const valor = parseFloat(input.value);
			
			// NUEVOS RANGOS PARA 2-5 AÑOS:
			// Peso: 5-30 kg (aproximado según tablas)
			// Talla: 65-120 cm (según tablas oficiales)
			
			if (valor < min || valor > max) {
				input.classList.add('input-error');
				showToast(`⚠️ Valor fuera de rango para 2-5 años: ${min} - ${max}`, 'warning');
			} else {
				input.classList.remove('input-error');
			}
		}

function calcularEstadoNutricional() {
            const pesoInput = document.getElementById('nutricionPeso');
            const tallaInput = document.getElementById('nutricionTalla');
            const generoInput = document.querySelector('input[name="_ingresoGender"]:checked');
            const indicator = document.getElementById('nutricionIndicator');
            const statusEl = document.getElementById('nutricionStatus');
            const detailsEl = document.getElementById('nutricionDetails');
            const legendEl = document.getElementById('nutricionLegend');
			 
			const displayAge = document.getElementById('displayAge');
			const edadCalculada = displayAge ? displayAge.value : '';
			
            
            const checkIngreso = document.getElementById('checkIngreso');
			
			if (!edadCalculada || edadCalculada === 'Esperando fechas...') {
				
				console.log('Esperando cálculo de edad...');
			}
            if (!checkIngreso || !checkIngreso.checked) {
                if (indicator) indicator.style.display = 'none';
                return;
            }

            if (!pesoInput || !tallaInput || !generoInput) {
                if (indicator) indicator.style.display = 'none';
                return;
            }
            
            const peso = parseFloat(pesoInput.value);
            const talla = parseFloat(tallaInput.value);
            const genero = generoInput.value;

            if (!peso || !talla || isNaN(peso) || isNaN(talla)) {
                if (indicator) indicator.style.display = 'none';
                return;
            }
            
            const modal = document.getElementById('modalGraficaOMS');
            if (modal && modal.classList.contains('active')) {
                const generoInput = document.querySelector('input[name="_ingresoGender"]:checked');
                if (generoInput) {
                    requestAnimationFrame(() => {
                        dibujarGraficaEnModal(generoInput.value);
                    });
                }
            }

            const edadMeses = parseEdadAMeses(edadCalculada);
			const estado = calcularRangoOMS(talla, peso, genero, edadMeses);
			
			// ===== Validar rango de edad =====
			const validacionEdad = mostrarAdvertenciaEdad(edadMeses);
			if (!validacionEdad.valido) {
				// Mostrar advertencia pero permitir cálculo
				console.warn(validacionEdad.mensaje);
			}
			
			let advertenciaHTML = '';
			if (!validacionEdad.valido) {
				advertenciaHTML = `<div style="color: #F39C12; font-size: 11px; margin-top: 8px; padding: 8px; background: #FEF3C7; border-radius: 6px; border: 1px solid #FCD34D;">⚠️ ${validacionEdad.mensaje}</div>`;
			}
            
            if (indicator) {
                indicator.style.display = 'block';
                statusEl.textContent = estado.nombre;
                statusEl.className = `nutricion-status ${estado.clase}`;
                
				detailsEl.innerHTML = `
					<strong>DE (Desviación Estándar):</strong> ${estado.de}<br>
					<strong>Peso:</strong> ${peso} kg | <strong>Talla:</strong> ${talla} cm<br>
					<strong>Género:</strong> ${genero === 'M' ? 'Masculino' : 'Femenino'}<br>
					${edadMeses ? `<strong>Edad:</strong> ${Math.floor(edadMeses/12)} años ${edadMeses%12} meses<br>` : ''}
					<em style="font-size: 10px; color: #9ca3af;">* Tablas OMS Peso/Talla 2-5 años (Res. MINSALUD 2465/2016)</em>
					${advertenciaHTML}
				`;
                                
                legendEl.innerHTML = rangos.map(r => `
                    <div class="nutricion-legend-item ${r.clase}">
                        <span>${r.nombre}</span>
                        <span style="opacity: 0.8; font-size: 9px;">${r.de}</span>
                    </div>
                `).join('');
            }
        }

document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => inicializarGraficaOMS(), 100);
            
            ['nutricionPeso', 'nutricionTalla'].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.addEventListener('input', calcularEstadoNutricional);
            });
            
            document.querySelectorAll('input[name="_ingresoGender"]').forEach(input => {
                input.addEventListener('change', calcularEstadoNutricional);
            });
        });

function abrirModalGrafica() {
            const modal = document.getElementById('modalGraficaOMS');
            const generoInput = document.querySelector('input[name="_ingresoGender"]:checked');
            
            if (!generoInput) {
                showToast('Seleccione el género del beneficiario primero', 'warning');
                return;
            }
            
            document.body.classList.add('modal-open');
            
            const genero = generoInput.value;
            const content = modal.querySelector('.modal-grafica-content');
            
            content.classList.remove('boy', 'girl');
            content.classList.add(genero === 'M' ? 'boy' : 'girl');
            
            const title = document.getElementById('modalGraficaTitle');
            const icon = genero === 'M' ? '👦' : '👧';
            title.textContent = `Gráfica Peso/Talla OMS - ${genero === 'M' ? 'NIÑOS' : 'NIÑAS'} ${icon}`;
            
            modal.classList.add('active');
            
            requestAnimationFrame(() => {
                setTimeout(() => {
                    dibujarGraficaEnModal(genero);
                }, 100);
            });
            
            llenarLeyendaModal();
            
            window.addEventListener('resize', handleResizeModal);
        }

function cerrarModalGrafica(event) {
			if (event && event.target.closest('.modal-grafica-content')) {
				return;
			}
			
			const modal = document.getElementById('modalGraficaOMS');
			modal.classList.remove('active');
			document.body.classList.remove('modal-open');
			
			// Destruir Gráfica al cerrar
			if (ChartIndividual) {
				ChartIndividual.destroy();
				ChartIndividual = null;
			}
		}

let resizeTimeout;

function handleResizeModal() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const modal = document.getElementById('modalGraficaOMS');
                if (modal.classList.contains('active')) {
                    const generoInput = document.querySelector('input[name="_ingresoGender"]:checked');
                    if (generoInput) {
                        dibujarGraficaEnModal(generoInput.value);
                    }
                }
            }, 250);
        }

function dibujarGraficaOMS(canvasId, genero, peso = null, talla = null, edadMeses = null, nombre = '', datosExtra = {}) {
			const canvas = document.getElementById(canvasId);
			if (!canvas) {
				console.error('Canvas no encontrado:', canvasId);
				return;
			}
			
			// Obtener el contenedor para dimensiones
			const wrapper = canvas.closest('.modal-grafica-canvas-wrapper') || 
							canvas.closest('.chart-container-nutricional') ||
							canvas.parentElement;
			
			if (!wrapper) {
				console.error('Wrapper no encontrado para canvas:', canvasId);
				return;
			}
			
			const rect = wrapper.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			
			// Configurar dimensiones del canvas
			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			canvas.style.width = rect.width + 'px';
			canvas.style.height = rect.height + 'px';
			
			const ctx = canvas.getContext('2d');
			ctx.scale(dpr, dpr);
			ctx.clearRect(0, 0, rect.width, rect.height);
			
			const width = rect.width;
			const height = rect.height;
			
			// Padding proporcional
			const padding = {
				top: height * 0.12,
				right: width * 0.15,
				bottom: height * 0.18,
				left: width * 0.12
			};
			
			const chartWidth = width - padding.left - padding.right;
			const chartHeight = height - padding.top - padding.bottom;
			
			// Dibujar elementos base
			dibujarGridOMS(ctx, padding, chartWidth, chartHeight, width, height);
			dibujarEjesOMS(ctx, padding, chartWidth, chartHeight, width, height);
			dibujarCurvasOMS(ctx, genero, padding, chartWidth, chartHeight);
			
			// Dibujar punto del niño si hay datos
			if (peso !== null && talla !== null && !isNaN(peso) && !isNaN(talla)) {
				dibujarPuntoNinoOMS(ctx, talla, peso, padding, chartWidth, chartHeight, genero, edadMeses, nombre, datosExtra);
			}
			
			// Actualizar leyenda si existe
			if (document.getElementById('modalGraficaLeyenda')) {
				llenarLeyendaModal();
			}
			if (document.getElementById('leyendaIndividual')) {
				llenarLeyendaIndividual();
			}
		}

function dibujarGridOMS(ctx, padding, chartWidth, chartHeight, width, height) {
			ctx.strokeStyle = document.body.classList.contains('dark-mode') ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
			ctx.lineWidth = Math.max(0.5, height * 0.002);
			
			// Líneas horizontales
			for (let i = 0; i <= 10; i++) {
				const y = padding.top + (i * chartHeight / 10);
				ctx.beginPath();
				ctx.moveTo(padding.left, y);
				ctx.lineTo(width - padding.right, y);
				ctx.stroke();
			}
			
			// Líneas verticales
			for (let i = 0; i <= 8; i++) {
				const x = padding.left + (i * chartWidth / 8);
				ctx.beginPath();
				ctx.moveTo(x, padding.top);
				ctx.lineTo(x, height - padding.bottom);
				ctx.stroke();
			}
		}

function dibujarEjesOMS(ctx, padding, chartWidth, chartHeight, width, height) {
			const isDark = document.body.classList.contains('dark-mode');
			
			// Ejes principales
			ctx.strokeStyle = isDark ? '#e2e8f0' : '#374151';
			ctx.lineWidth = Math.max(1.5, height * 0.004);
			ctx.beginPath();
			ctx.moveTo(padding.left, padding.top);
			ctx.lineTo(padding.left, height - padding.bottom);
			ctx.lineTo(width - padding.right, height - padding.bottom);
			ctx.stroke();
			
			// Título eje X
			ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
			ctx.font = `bold ${Math.max(10, height * 0.025)}px Inter, sans-serif`;
			ctx.textAlign = 'center';
			ctx.fillText('Talla (cm)', padding.left + chartWidth / 2, height - padding.bottom / 3);
			
			// Título eje Y (rotado)
			ctx.save();
			ctx.translate(padding.left / 2, padding.top + chartHeight / 2);
			ctx.rotate(-Math.PI / 2);
			ctx.fillText('Peso (kg)', 0, 0);
			ctx.restore();
			
			// Ticks Y (peso: 5-33 kg)
			ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
			ctx.font = `${Math.max(9, height * 0.02)}px Inter, sans-serif`;
			ctx.textAlign = 'right';
			
			for (let i = 0; i <= 9; i++) {
				const peso = 5 + (i * 3); // 5, 8, 11, 14, 17, 20, 23, 26, 29, 32
				const y = padding.top + ((33 - peso) / (33 - 5)) * chartHeight;
				ctx.fillText(peso.toFixed(0), padding.left - 8, y + 4);
			}
			
			// Ticks X (talla: 65-120 cm)
			ctx.textAlign = 'center';
			for (let i = 0; i <= 11; i++) {
				const talla = 65 + (i * 5); // 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120
				const x = padding.left + ((talla - 65) / (120 - 65)) * chartWidth;
				ctx.fillText(talla, x, height - padding.bottom + 20);
			}
		}

function dibujarCurvasOMS(ctx, genero, padding, chartWidth, chartHeight) {
			// Usa la tabla LMS oficial de la OMS (resolución de 0.5cm) para dibujar
			// las 7 curvas de desviación estándar con precisión exacta.
			const tallas = OMS_TALLAS_LMS; // 65.0, 65.5, 66.0 ... 120.0
			const zValores = [-3, -2, -1, 0, 1, 2, 3];
			
			const minTalla = 65;
			const maxTalla = 120;
			const minPeso = 5;
			const maxPeso = 33;
			
			const baseLineWidth = Math.max(1, chartHeight * 0.004);
			
			// Dibujar las 7 curvas DE
			for (let deIndex = 0; deIndex < 7; deIndex++) {
				const z = zValores[deIndex];
				ctx.strokeStyle = DE_COLORS[deIndex];
				ctx.lineWidth = deIndex === 3 ? baseLineWidth * 2.5 : baseLineWidth * 1.5;
				ctx.setLineDash(deIndex === 3 ? [] : [5, 5]);
				ctx.beginPath();
				
				let firstPoint = true;
				
				tallas.forEach(talla => {
					const peso = pesoParaZScore(z, talla, genero);
					const x = padding.left + ((talla - minTalla) / (maxTalla - minTalla)) * chartWidth;
					const y = padding.top + ((maxPeso - peso) / (maxPeso - minPeso)) * chartHeight;
					
					if (firstPoint) {
						ctx.moveTo(x, y);
						firstPoint = false;
					} else {
						ctx.lineTo(x, y);
					}
				});
				
				ctx.stroke();
				
				// Etiqueta de la curva al final
				const lastTalla = tallas[tallas.length - 1];
				const lastPeso = pesoParaZScore(z, lastTalla, genero);
				const lastX = padding.left + ((lastTalla - minTalla) / (maxTalla - minTalla)) * chartWidth;
				const lastY = padding.top + ((maxPeso - lastPeso) / (maxPeso - minPeso)) * chartHeight;
				
				ctx.fillStyle = DE_COLORS[deIndex];
				ctx.font = `bold ${Math.max(10, chartHeight * 0.022)}px Inter, sans-serif`;
				ctx.textAlign = 'left';
				ctx.fillText(DE_LABELS[deIndex], lastX + 8, lastY + 4);
			}
			
			ctx.setLineDash([]); // Resetear dash
		}

function dibujarPuntoNinoOMS(ctx, talla, peso, padding, chartWidth, chartHeight, genero, edadMeses = null, nombre = '', datosExtra = {}) {
			const minTalla = 65;
			const maxTalla = 120;
			const minPeso = 5;
			const maxPeso = 33;
			
			const x = padding.left + ((talla - minTalla) / (maxTalla - minTalla)) * chartWidth;
			const y = padding.top + ((maxPeso - peso) / (maxPeso - minPeso)) * chartHeight;
			
			// Validar que el punto esté dentro del canvas
			if (x < padding.left || x > padding.left + chartWidth || 
				y < padding.top || y > padding.top + chartHeight) {
				console.warn(`Punto (${talla}cm, ${peso}kg) fuera de rango visual`);
				return;
			}
			
			// Calcular estado nutricional para color
			const estado = calcularRangoOMS(talla, peso, genero, edadMeses);
			const colorPunto = estado.color;
			
			const puntoSize = Math.max(10, chartHeight * 0.035);
			
			// Halo de advertencia si está fuera de rango de edad
			if (edadMeses !== null && (edadMeses < 24 || edadMeses > 72)) {
				ctx.beginPath();
				ctx.arc(x, y, puntoSize * 2.5, 0, 2 * Math.PI);
				ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
				ctx.fill();
			}
			
			// Punto principal con color según estado nutricional
			ctx.beginPath();
			ctx.arc(x, y, puntoSize, 0, 2 * Math.PI);
			ctx.fillStyle = colorPunto;
			ctx.fill();
			ctx.strokeStyle = 'white';
			ctx.lineWidth = Math.max(3, puntoSize * 0.3);
			ctx.stroke();
			
			// Etiqueta con valores
			ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b';
			ctx.font = `bold ${Math.max(12, chartHeight * 0.028)}px Inter, sans-serif`;
			ctx.textAlign = 'center';
			ctx.fillText(`${peso}kg / ${talla}cm`, x, y - puntoSize * 1.8);
			
			// Si hay nombre, mostrarlo
			if (nombre) {
				ctx.font = `${Math.max(10, chartHeight * 0.022)}px Inter, sans-serif`;
				ctx.fillText(nombre.toUpperCase(), x, y - puntoSize * 3);
			}
			
			return { x, y, estado };
		}

function dibujarGraficaEnModal(genero) {
			const pesoInput = document.getElementById('nutricionPeso');
			const tallaInput = document.getElementById('nutricionTalla');
			const displayAge = document.getElementById('displayAge');
			
			let peso = null, talla = null, edadMeses = null;
			
			if (pesoInput && pesoInput.value) peso = parseFloat(pesoInput.value);
			if (tallaInput && tallaInput.value) talla = parseFloat(tallaInput.value);
			if (displayAge && displayAge.value) edadMeses = parseEdadAMeses(displayAge.value);
			
			// Dibujar usando la función unificada
			dibujarGraficaOMS('omsChartModal', genero, peso, talla, edadMeses);
			
			// Actualizar subtítulo si hay datos
			if (peso !== null && talla !== null) {
				const estado = calcularRangoOMS(talla, peso, genero, edadMeses);
				const subtitle = document.getElementById('modalGraficaSubtitle');
				let edadTexto = edadMeses ? ` • ${Math.floor(edadMeses/12)}a ${edadMeses%12}m` : '';
				let advertenciaHTML = '';
				
				if (edadMeses !== null) {
					const validacion = mostrarAdvertenciaEdad(edadMeses);
					if (!validacion.valido) {
						advertenciaHTML = `<div style="color: #F39C12; font-size: 11px; margin-top: 8px; padding: 8px; background: #FEF3C7; border-radius: 6px; border: 1px solid #FCD34D;">⚠️ ${validacion.mensaje}</div>`;
					}
				}
				
				if (subtitle) {
					subtitle.innerHTML = `<strong style="color: ${estado.color}">${estado.nombre}</strong> (DE: ${estado.de})${edadTexto}${advertenciaHTML}`;
				}
			}
		}

function llenarLeyendaModal() {
			const container = document.getElementById('modalGraficaLeyenda');
			if (!container) return;
			
			// Leyenda actualizada para tablas 2-5 años
			const rangos = [
				{ nombre: 'Desnutrición Severa (<-3DE)', color: '#C0392B', de: '< -3DE', desc: 'Intervención inmediata' },
				{ nombre: 'Desnutrición Moderada', color: '#E74C3C', de: '-3DE a -2DE', desc: 'Seguimiento cercano' },
				{ nombre: 'Riesgo Desnutrición', color: '#F39C12', de: '-2DE a -1DE', desc: 'Monitoreo preventivo' },
				{ nombre: 'Peso Adecuado (Mediana)', color: '#27AE60', de: '-1DE a +1DE', desc: 'Estado óptimo' },
				{ nombre: 'Riesgo Sobrepeso', color: '#F1C40F', de: '+1DE a +1.5DE', desc: 'Vigilar alimentación' },
				{ nombre: 'Sobrepeso', color: '#E67E22', de: '+1.5DE a +2DE', desc: 'Ajustar dieta/actividad' },
				{ nombre: 'Obesidad (>+2DE)', color: '#8E44AD', de: '> +2DE', desc: 'Intervención nutricional' }
			];
			
			container.innerHTML = rangos.map(r => `
				<div class="leyenda-item" style="border-left: 4px solid ${r.color}; padding-left: 8px;">
					<div class="leyenda-color" style="background: ${r.color}; width: 20px; height: 20px; border-radius: 50%;"></div>
					<div style="flex: 1;">
						<div style="font-weight: 700; color: ${r.color}; font-size: 11px; line-height: 1.2;">${r.nombre}</div>
						<div style="font-size: 9px; color: #64748b; line-height: 1.2;">${r.de} • ${r.desc}</div>
					</div>
				</div>
			`).join('');
		}

function mostrarAdvertenciaEdad(edadMeses) {
			// Validar que el niño esté en rango 2-5 años (24-60 meses)
			if (edadMeses !== null) {
				if (edadMeses < 24) {
					return {
						valido: false,
						mensaje: `⚠️ Edad ${Math.floor(edadMeses/12)} años ${edadMeses%12} meses: Las tablas OMS son para 2-5 años`,
						tipo: 'warning'
					};
				} else if (edadMeses > 72) { // 6 años = 72 meses, damos margen
					return {
						valido: false,
						mensaje: `⚠️ Edad ${Math.floor(edadMeses/12)} años: Recomendado usar tablas 5-10 años`,
						tipo: 'warning'
					};
				}
			}
			return { valido: true, mensaje: '', tipo: 'success' };
		}

document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                cerrarModalGrafica();
            }
        });

document.getElementById('modalGraficaOMS').addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalGrafica();
            }
        });

function getNutricionColor(estado) {
    if (!estado) return '#94a3b8';
    if (estado.includes('Severa')) return '#ef4444';
    if (estado.includes('Moderada')) return '#f87171';
    if (estado.includes('Riesgo') && estado.includes('Desnutrición')) return '#fbbf24';
    if (estado.includes('Normal')) return '#10b981';
    if (estado.includes('Sobrepeso')) return '#f97316';
    if (estado.includes('Obesidad')) return '#dc2626';
    return '#94a3b8';
}

function abrirEditNutricion(noveltyId) {
    const novelty = currentNovelties.find(n => n.id === noveltyId);
    if (!novelty) { showToast('No se encontró la novedad', 'error'); return; }

    // Remove old modal if exists
    const oldModal = document.getElementById('editNutricionModal');
    if (oldModal) oldModal.remove();

    const nutricion = novelty.nutricion || {};

    const modal = document.createElement('div');
    modal.id = 'editNutricionModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:white;border-radius:20px;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;">
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:18px 22px;display:flex;align-items:center;gap:12px;">
                <span style="font-size:24px;">🍎</span>
                <div>
                    <h3 style="color:white;font-weight:800;font-size:16px;margin:0;">Completar Datos Nutricionales</h3>
                    <p style="color:#fef3c7;font-size:12px;margin:2px 0 0;">${novelty.ingreso?.name || novelty.name || 'Beneficiario'}</p>
                </div>
                <button onclick="document.getElementById('editNutricionModal').remove()" style="margin-left:auto;background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;font-weight:bold;">×</button>
            </div>
            <div style="padding:22px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div style="grid-column:1/-1;">
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">Fecha de Valoración *</label>
                    <input type="date" id="en_fecha" value="${nutricion.fecha || ''}"
                        style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">Peso (kg) * <span style="font-weight:400;">(5-30)</span></label>
                    <input type="number" id="en_peso" step="0.1" min="5" max="30" placeholder="Ej: 12.5" value="${nutricion.peso || ''}"
                        style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">Talla (cm) * <span style="font-weight:400;">(65-120)</span></label>
                    <input type="number" id="en_talla" step="0.1" min="65" max="120" placeholder="Ej: 85.0" value="${nutricion.talla || ''}"
                        style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">Perímetro Braquial (cm) * <span style="font-weight:400;">(6-30)</span></label>
                    <input type="number" id="en_perimetro" step="0.1" min="6" max="30" placeholder="Ej: 15.5" value="${nutricion.perimetroBraquial || ''}"
                        style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">Régimen</label>
                    <select id="en_regimen" style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                        <option value="">Seleccione...</option>
                        <option value="SUBSIDIADO" ${nutricion.regimen==='SUBSIDIADO'?'selected':''}>SUBSIDIADO</option>
                        <option value="CONTRIBUTIVO" ${nutricion.regimen==='CONTRIBUTIVO'?'selected':''}>CONTRIBUTIVO</option>
                        <option value="ESPECIAL" ${nutricion.regimen==='ESPECIAL'?'selected':''}>ESPECIAL</option>
                        <option value="NO_AFILIADO" ${nutricion.regimen==='NO_AFILIADO'?'selected':''}>NO AFILIADO</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">EPS</label>
                    <input type="text" id="en_eps" placeholder="Nombre de la EPS" value="${nutricion.eps || ''}"
                        style="width:100%;margin-top:4px;padding:8px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;">
                </div>
            </div>
            <div style="padding:0 22px 22px;display:flex;gap:10px;justify-content:flex-end;">
                <button onclick="document.getElementById('editNutricionModal').remove()" style="padding:10px 20px;border:2px solid #e2e8f0;background:white;color:#64748b;border-radius:12px;font-weight:700;cursor:pointer;">Cancelar</button>
                <button onclick="guardarEditNutricion('${noveltyId}')" style="padding:10px 24px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:12px;font-weight:800;cursor:pointer;font-size:14px;">💾 Guardar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

async function guardarEditNutricion(noveltyId) {
    const fecha = document.getElementById('en_fecha')?.value;
    const peso = parseFloat(document.getElementById('en_peso')?.value);
    const talla = parseFloat(document.getElementById('en_talla')?.value);
    const perimetro = parseFloat(document.getElementById('en_perimetro')?.value);
    const regimen = document.getElementById('en_regimen')?.value;
    const eps = document.getElementById('en_eps')?.value;

    if (!fecha) { showToast('❌ La fecha de valoración es obligatoria', 'error'); return; }
    if (!peso || peso < 5 || peso > 30) { showToast('❌ Peso inválido (5-30 kg)', 'error'); return; }
    if (!talla || talla < 65 || talla > 120) { showToast('❌ Talla inválida (65-120 cm)', 'error'); return; }
    if (!perimetro || perimetro < 6 || perimetro > 30) { showToast('❌ Perímetro braquial inválido (6-30 cm)', 'error'); return; }

    // Calculate estado nutricional using existing logic
    const novelty = currentNovelties.find(n => n.id === noveltyId);
    const dob = novelty?.ingreso?.dob || novelty?.ingresoDOB || '';
    const ingresoDate = novelty?.ingreso?.ingresoDate || novelty?.ingresoDate || '';
    const gender = novelty?.ingreso?.gender || novelty?.gender || '';
    let estadoNutricional = 'Sin calcular';
    try {
        estadoNutricional = calcularEstadoNutricionalDirecto(peso, talla, dob, ingresoDate, gender) || 'Sin calcular';
    } catch(e) {}

    const nutricionData = {
        pendiente: false,
        fecha,
        peso: peso.toString(),
        talla: talla.toString(),
        perimetroBraquial: perimetro.toString(),
        regimen: regimen || '',
        eps: eps || '',
        estadoNutricional
    };

    try {
        await database.ref(`${AsociacionesModule.getRef('novelties')}/${noveltyId}/nutricion`).set(nutricionData);
        // Update local cache
        const idx = currentNovelties.findIndex(n => n.id === noveltyId);
        if (idx !== -1) currentNovelties[idx].nutricion = nutricionData;

        showToast('✅ Datos nutricionales guardados correctamente', 'success');
        document.getElementById('editNutricionModal')?.remove();

        // Refresh current modal if open
        if (currentNoveltyData && currentNoveltyData.id === noveltyId) {
            currentNoveltyData.nutricion = nutricionData;
            const cardsView = document.getElementById('cardsView');
            const plainTextContent = document.getElementById('plainTextContent');
            let udsCode = '', udsName = currentNoveltyData.udsName || '';
            if (currentNoveltyData.udsFull && currentNoveltyData.udsFull.includes(' - ')) {
                const parts = currentNoveltyData.udsFull.split(' - ');
                udsName = parts[0]; udsCode = parts[1];
            }
            if (cardsView) cardsView.innerHTML = generateFiveCards(currentNoveltyData, false, udsName, udsCode);
            if (plainTextContent) plainTextContent.textContent = generatePlainTextFive(currentNoveltyData, false, udsName, udsCode);
        }

        loadNovelties();
    } catch(err) {
        showToast('❌ Error al guardar: ' + err.message, 'error');
    }
}

function calcularEstadoNutricionalDirecto(peso, talla, dob, fechaIngreso, gender) {
    if (!peso || !talla || !dob || !fechaIngreso) return null;
    const fechaRef = new Date(fechaIngreso);
    const fechaNac = new Date(dob);
    if (isNaN(fechaRef) || isNaN(fechaNac)) return null;
    const meses = (fechaRef.getFullYear() - fechaNac.getFullYear()) * 12 + (fechaRef.getMonth() - fechaNac.getMonth());
    if (meses < 0 || meses > 60) return null;
    const zPT = calcularZScore(peso, talla, gender, 'PT', meses);
    if (zPT === null) return 'Sin datos OMS';
    if (zPT < -3) return 'Desnutrición Aguda Severa';
    if (zPT < -2) return 'Desnutrición Aguda Moderada';
    if (zPT < -1) return 'Riesgo de Desnutrición';
    if (zPT <= 1) return 'Peso Normal';
    if (zPT <= 2) return 'Riesgo de Sobrepeso';
    if (zPT <= 3) return 'Sobrepeso';
    return 'Obesidad';
}

let datosNutricionales = [];

let datosNutricionalesFiltrados = [];

let paginaNutricional = 1;

const itemsPorPaginaNutricional = 15;

let chartEstados = null;

let chartContratos = null;

let chartEvolucion = null;

let chartPesoTalla = null;

let chartCriticosUDS = null;

let chartPerimetro = null;

let chartIndividual = null;

const COLORES_GRAFICAS = {
    primarios: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'],
    desnutricion: {
        severa: '#C0392B',      // Rojo oscuro
        moderada: '#E74C3C',    // Rojo
        riesgo: '#F39C12',      // Naranja
        normal: '#27AE60',      // Verde
        riesgoSobrepeso: '#F1C40F', // Amarillo
        sobrepeso: '#E67E22',   // Naranja oscuro
        obesidad: '#8E44AD'     // Púrpura
    },
    contratos: new Proxy({
        _palette: ['#F39C12','#3498DB','#27AE60','#E91E63','#9C27B0','#FF5722','#009688','#795548']
    }, {
        get(target, prop) {
            if (prop in target) return target[prop];
            const contratos = Object.keys(window.UDS_DATA || {});
            const idx = contratos.indexOf(prop);
            if (idx >= 0) return target._palette[idx % target._palette.length];
            return '#95A5A6';
        }
    }),
    estadoBorde: {
        severa: '3px solid #C0392B',
        moderada: '3px solid #E74C3C',
        'riesgo-desnutricion': '3px solid #F39C12',
        normal: '3px solid #27AE60',
        'riesgo-sobrepeso': '3px solid #F1C40F',
        sobrepeso: '3px solid #E67E22',
        obesidad: '3px solid #8E44AD',
        'sin-datos': '3px solid #95A5A6'
    }
};

function initNutricionalSection() {
    cargarDatosNutricionales();
}

async function cargarDatosNutricionales() {
    showToast('🍎 Cargando datos nutricionales...', 'info');
    
    try {
        const [activasSnap, archivadasSnap] = await Promise.all([
            database.ref(AsociacionesModule.getRef('novelties')).once('value'),
            database.ref(AsociacionesModule.getRef('archived')).once('value')
        ]);
        
        const activas = activasSnap.val() || {};
        const archivadas = archivadasSnap.val() || {};
        
        datosNutricionales = [];
        
        // Procesar activas
        Object.entries(activas).forEach(([id, data]) => {
            const registro = extraerDatosNutricionales(id, data, 'activa');
            if (registro) datosNutricionales.push(registro);
        });
        
        // Procesar archivadas
        Object.entries(archivadas).forEach(([id, data]) => {
            const registro = extraerDatosNutricionales(id, data, 'archivada');
            if (registro) datosNutricionales.push(registro);
        });
        
        // Aplicar filtros iniciales
        filterNutricionalData();
        
        showToast(`✅ ${datosNutricionales.length} registros nutricionales cargados`, 'success');
    } catch (error) {
        console.error('Error cargando datos nutricionales:', error);
        showToast('❌ Error al cargar datos nutricionales', 'error');
    }
}

function extraerDatosNutricionales(id, data, tipo) {
    // Solo procesar si tiene datos de ingreso (donde está la info nutricional)
    if (!data.hasIngreso && data.type !== 'ingreso' && data.type !== 'ambos') {
        return null;
    }
    
    const ingreso = data.ingreso || data;
    const nutricion = data.nutricion || (data.ingreso && data.ingreso.nutricion) || {};
    
    // Extraer código UDS
    let udsCode = '';
    let udsName = data.udsName || 'Sin UDS';
    if (data.udsFull && data.udsFull.includes(' - ')) {
        const parts = data.udsFull.split(' - ');
        udsName = parts[0];
        udsCode = parts[1];
    }
    
    // Determinar estado nutricional con cálculo si no existe
    let estadoNutricional = nutricion.estadoNutricional || 'Sin datos';
    let categoriaEstado = categorizarEstado(estadoNutricional);
    
    // Si hay peso y talla pero no hay estado calculado, calcularlo
    if (estadoNutricional === 'Sin datos' && nutricion.peso && nutricion.talla && ingreso.gender) {
        const calculado = calcularRangoOMS(parseFloat(nutricion.talla), parseFloat(nutricion.peso), ingreso.gender);
        estadoNutricional = calculado.nombre;
        categoriaEstado = categorizarEstado(estadoNutricional);
    }
    
    return {
        id,
        tipo,
        originalData: data,
        // Info general
        contract: data.contract || 'N/A',
        udsName,
        udsCode,
        fechaRegistro: data.timestamp,
        // Info niño
        nombre: ingreso.name || 'N/A',
        documento: ingreso.document || 'N/A',
        tipoDoc: ingreso.docType || 'RC',
        edad: ingreso.age || data.age || 'N/A',
        fechaNacimiento: ingreso.dob || ingreso.ingresoDOB || data.ingresoDOB,
        genero: ingreso.gender || 'N/A',
        // Info nutricional
        peso: parseFloat(nutricion.peso) || null,
        talla: parseFloat(nutricion.talla) || null,
        perimetroBraquial: parseFloat(nutricion.perimetroBraquial) || null,
        fechaValoracion: nutricion.fecha || null,
        regimen: nutricion.regimen || 'N/A',
        eps: nutricion.eps || 'N/A',
        estadoNutricional,
        categoriaEstado,
        // Para gráficas
        imc: (nutricion.peso && nutricion.talla) ? 
            (nutricion.peso / Math.pow(nutricion.talla / 100, 2)).toFixed(2) : null
    };
}

function categorizarEstado(estado) {
    if (!estado || estado === 'Sin datos') return 'sin-datos';
    if (estado.includes('Severa')) return 'severa';
    if (estado.includes('Moderada')) return 'moderada';
    if (estado.includes('Riesgo') && estado.includes('Desnutrición')) return 'riesgo-desnutricion';
    if (estado.includes('Normal')) return 'normal';
    if (estado.includes('Riesgo') && estado.includes('Sobrepeso')) return 'riesgo-sobrepeso';
    if (estado.includes('Sobrepeso')) return 'sobrepeso';
    if (estado.includes('Obesidad')) return 'obesidad';
    return 'sin-datos';
}

function filterNutricionalData() {
    const contrato = document.getElementById('nutricionalFilterContract')?.value || '';
    const estado = document.getElementById('nutricionalFilterEstado')?.value || '';
    const tipo = document.getElementById('nutricionalFilterTipo')?.value || 'ambas';
    const critico = document.getElementById('nutricionalFilterCritico')?.value || '';
    const mes = document.getElementById('nutricionalFilterMes')?.value || '';
    const search = document.getElementById('nutricionalSearch')?.value.toLowerCase() || '';
    
    datosNutricionalesFiltrados = datosNutricionales.filter(d => {
        // Filtro por contrato
        if (contrato && d.contract !== contrato) return false;
        
        // Filtro por estado nutricional - CORREGIDO
        if (estado) {
            // Coincidencia exacta o parcial del estado
            const estadoLower = estado.toLowerCase();
            const dEstadoLower = d.estadoNutricional.toLowerCase();
            
            // Si es "Sin datos", buscar exacto
            if (estado === 'Sin datos') {
                if (d.estadoNutricional !== 'Sin datos') return false;
            } else {
                // Para otros estados, buscar coincidencia parcial
                if (!dEstadoLower.includes(estadoLower)) return false;
            }
        }
        
        // Filtro por tipo (activa/archivada)
        if (tipo === 'activas' && d.tipo !== 'activa') return false;
        if (tipo === 'archivadas' && d.tipo !== 'archivada') return false;
        
        // Filtro por mes
        if (mes && d.fechaValoracion) {
            const fechaVal = new Date(d.fechaValoracion);
            const mesVal = fechaVal.toISOString().slice(0, 7);
            if (mesVal !== mes) return false;
        }
        
        // Filtro por búsqueda
        if (search) {
            const matchNombre = d.nombre?.toLowerCase().includes(search);
            const matchDoc = d.documento?.includes(search);
            const matchUDS = d.udsName?.toLowerCase().includes(search);
            if (!matchNombre && !matchDoc && !matchUDS) return false;
        }
        
        return true;
    });
    
    // Resetear paginación al filtrar
    paginaNutricional = 1;
    
    // Actualizar UI
    actualizarResumenRapido();
    actualizarGraficasNutricionales();
    renderizarAccordionEstados();
    renderizarTablaNutricional();
    actualizarInfoFiltros();
}

function actualizarInfoFiltros() {
    const estado = document.getElementById('nutricionalFilterEstado')?.value || '';
    const contrato = document.getElementById('nutricionalFilterContract')?.value || '';
    const critico = document.getElementById('nutricionalFilterCritico')?.value || '';
    
    // Info para gráfica de distribución
    const infoDistribucion = document.getElementById('infoDistribucion');
    if (infoDistribucion) {
        let mensaje = '';
        if (estado) mensaje += `<strong>Filtrado por:</strong> ${estado}`;
        if (contrato) mensaje += (mensaje ? ' | ' : '<strong>Filtrado por:</strong> ') + `Contrato ${contrato}`;
        if (critico) mensaje += (mensaje ? ' | ' : '<strong>Filtrado por:</strong> ') + `Casos ${critico}`;
        
        infoDistribucion.innerHTML = mensaje || 'Mostrando todos los registros';
        infoDistribucion.style.display = 'block';
    }
    
    // Info para gráfica de contratos
    const infoContratos = document.getElementById('infoContratos');
    if (infoContratos) {
        let mensaje = '';
        if (estado) mensaje = `<strong>Análisis de:</strong> ${estado} por contrato`;
        else if (critico) mensaje = `<strong>Análisis de casos:</strong> ${critico} por contrato`;
        else mensaje = '<strong>Distribución por contrato:</strong> Todos los estados';
        
        infoContratos.innerHTML = mensaje;
        infoContratos.style.display = 'block';
    }
    
    // Info para gráfica de críticos por UDS
    const infoCriticosUDS = document.getElementById('infoCriticosUDS');
    if (infoCriticosUDS) {
        let mensaje = '';
        if (estado) mensaje = `<strong>UDS con más casos de:</strong> ${estado}`;
        else if (critico) mensaje = `<strong>UDS con casos:</strong> ${critico}`;
        else mensaje = '<strong>UDS con más casos críticos:</strong> Desnutrición severa, moderada y obesidad';
        
        infoCriticosUDS.innerHTML = mensaje;
        infoCriticosUDS.style.display = 'block';
    }
}

function actualizarResumenRapido() {
    const container = document.getElementById('nutricionalResumenRapido');
    if (!container) return;
    
    const total = datosNutricionalesFiltrados.length;
    
    // Contar por categoría
    const conteos = {};
    datosNutricionalesFiltrados.forEach(d => {
        conteos[d.categoriaEstado] = (conteos[d.categoriaEstado] || 0) + 1;
    });
    
    const criticos = (conteos['severa'] || 0) + (conteos['moderada'] || 0) + (conteos['obesidad'] || 0);
    const alertas = (conteos['riesgo-desnutricion'] || 0) + (conteos['riesgo-sobrepeso'] || 0) + (conteos['sobrepeso'] || 0);
    const normales = conteos['normal'] || 0;
    const sinDatos = conteos['sin-datos'] || 0;
    
    // Determinar contrato con más casos si hay filtro de estado
    const estadoFiltrado = document.getElementById('nutricionalFilterEstado')?.value || '';
    let contratoMax = '';
    let maxCount = 0;
    
    if (estadoFiltrado && estadoFiltrado !== 'Sin datos') {
        const porContrato = {};
        datosNutricionalesFiltrados.forEach(d => {
            if (d.estadoNutricional.includes(estadoFiltrado)) {
                porContrato[d.contract] = (porContrato[d.contract] || 0) + 1;
            }
        });
        
        Object.entries(porContrato).forEach(([contrato, count]) => {
            if (count > maxCount) {
                maxCount = count;
                contratoMax = contrato;
            }
        });
    }
    
    let html = `
        <div class="stats-card text-center p-3" style="border-left: 4px solid #3498DB;">
            <div class="text-2xl font-black text-slate-800 dark:text-white">${total}</div>
            <div class="text-xs text-slate-500 uppercase">Total Analizados</div>
        </div>
        
    `;
    
    // Agregar tarjeta de contrato líder si hay filtro de estado
    if (contratoMax && maxCount > 0) {
        const colorContrato = COLORES_GRAFICAS.contratos[contratoMax] || '#95A5A6';
        html += `
            <div class="stats-card text-center p-3" style="border-left: 4px solid ${colorContrato}; grid-column: span 2;">
                <div class="text-lg font-black" style="color: ${colorContrato};">Contrato ${contratoMax}</div>
                <div class="text-xs text-slate-500 uppercase">Con más casos de ${estadoFiltrado}: ${maxCount}</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function actualizarGraficasNutricionales() {
    graficarDistribucionEstados();
    graficarPorContrato();
    graficarEvolucionMensual();
    graficarPesoTalla();
    graficarCriticosPorUDS();
    graficarPerimetroBraquial();
}

function graficarDistribucionEstados() {
    const ctx = document.getElementById('chartEstadosNutricionales');
    if (!ctx) return;
    
    const conteos = {};
    datosNutricionalesFiltrados.forEach(d => {
        conteos[d.estadoNutricional] = (conteos[d.estadoNutricional] || 0) + 1;
    });
    
    const labels = Object.keys(conteos);
    const data = Object.values(conteos);
    
    // Asignar colores según el estado
    const colors = labels.map(l => {
        if (l.includes('Severa')) return COLORES_GRAFICAS.desnutricion.severa;
        if (l.includes('Moderada')) return COLORES_GRAFICAS.desnutricion.moderada;
        if (l.includes('Riesgo') && l.includes('Desnutrición')) return COLORES_GRAFICAS.desnutricion.riesgo;
        if (l.includes('Normal')) return COLORES_GRAFICAS.desnutricion.normal;
        if (l.includes('Riesgo') && l.includes('Sobrepeso')) return COLORES_GRAFICAS.desnutricion.riesgoSobrepeso;
        if (l.includes('Sobrepeso')) return COLORES_GRAFICAS.desnutricion.sobrepeso;
        if (l.includes('Obesidad')) return COLORES_GRAFICAS.desnutricion.obesidad;
        return '#95A5A6';
    });
    
    if (chartEstados) chartEstados.destroy();
    
    chartEstados = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '50%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { 
                        boxWidth: 15, 
                        padding: 15,
                        font: { size: 11, weight: 'bold' },
                        color: document.body.classList.contains('dark-mode') ? '#e2e8f0' : '#334155',
                        generateLabels: function(chart) {
                            const data = chart.data;
                            return data.labels.map((label, i) => ({
                                text: `${label}: ${data.datasets[0].data[i]}`,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                hidden: false,
                                index: i
                            }));
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function graficarPorContrato() {
    const ctx = document.getElementById('chartPorContrato');
    if (!ctx) return;
    
    const estadoFiltrado = document.getElementById('nutricionalFilterEstado')?.value || '';
    
    // Obtener contratos dinámicamente del perfil activo
    const contratosActivos = Object.keys(window.UDS_DATA || {});
    const perfil = AsociacionesModule.getPerfilActivo();
    const contratosLabels = contratosActivos.map(c => (perfil?.contratos?.[c]) || `Contrato ${c}`);
    
    // Agrupar por contrato y estado
    const porContrato = {};
    contratosActivos.forEach(c => { porContrato[c] = {}; });
    
    const estadosUnicos = [...new Set(datosNutricionalesFiltrados.map(d => d.estadoNutricional))];
    
    datosNutricionalesFiltrados.forEach(d => {
        if (porContrato[d.contract] !== undefined) {
            porContrato[d.contract][d.estadoNutricional] = 
                (porContrato[d.contract][d.estadoNutricional] || 0) + 1;
        }
    });
    
    // Si hay filtro de estado, mostrar solo ese estado por contrato
    let datasets;
    if (estadoFiltrado && estadoFiltrado !== 'Sin datos') {
        // Modo: comparación de un estado específico entre contratos
        datasets = [{
            label: estadoFiltrado,
            data: contratosActivos.map(c => porContrato[c][estadoFiltrado] || 0),
            backgroundColor: contratosActivos.map(c => {
                const count = porContrato[c][estadoFiltrado] || 0;
                const baseColor = COLORES_GRAFICAS.contratos[c];
                return count > 0 ? baseColor : '#E5E7EB';
            }),
            borderRadius: 8,
            borderWidth: 2,
            borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff'
        }];
    } else {
        // Modo: todos los estados apilados
        datasets = estadosUnicos.map((estado, idx) => ({
            label: estado,
            data: contratosActivos.map(c => porContrato[c][estado] || 0),
            backgroundColor: getColorPorEstado(estado),
            borderRadius: 4,
            borderWidth: 1,
            borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff'
        }));
    }
    
    if (chartContratos) chartContratos.destroy();
    
    chartContratos = new Chart(ctx, {
        type: estadoFiltrado ? 'bar' : 'bar',
        data: {
            labels: contratosLabels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: estadoFiltrado ? {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 },
                    title: { display: true, text: `Casos de ${estadoFiltrado}` }
                }
            } : {
                x: { stacked: true },
                y: { 
                    stacked: true, 
                    beginAtZero: true,
                    title: { display: true, text: 'Número de casos' }
                }
            },
            plugins: {
                legend: estadoFiltrado ? { display: false } : {
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12, 
                        font: { size: 9 },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            if (estadoFiltrado) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
                                return `Del total filtrado: ${percentage}%`;
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
}

function graficarEvolucionMensual() {
    const ctx = document.getElementById('chartEvolucionMensual');
    if (!ctx) return;
    
    const porMes = {};
    const porEstadoMes = {};
    
    datosNutricionalesFiltrados.forEach(d => {
        if (d.fechaValoracion) {
            const mes = d.fechaValoracion.slice(0, 7); // YYYY-MM
            porMes[mes] = (porMes[mes] || 0) + 1;
            
            if (!porEstadoMes[mes]) porEstadoMes[mes] = {};
            porEstadoMes[mes][d.categoriaEstado] = (porEstadoMes[mes][d.categoriaEstado] || 0) + 1;
        }
    });
    
    const meses = Object.keys(porMes).sort();
    
    // Crear datasets por estado
    const estadosOrden = ['severa', 'moderada', 'riesgo-desnutricion', 'normal', 'riesgo-sobrepeso', 'sobrepeso', 'obesidad'];
    const datasets = estadosOrden.map(estado => ({
        label: getNombreEstado(estado),
        data: meses.map(m => porEstadoMes[m]?.[estado] || 0),
        borderColor: getColorPorCategoria(estado),
        backgroundColor: getColorPorCategoria(estado) + '40', // 40 = 25% opacidad
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: getColorPorCategoria(estado),
        pointBorderColor: '#fff',
        pointBorderWidth: 2
    })).filter(ds => ds.data.some(v => v > 0)); // Solo mostrar estados con datos
    
    if (chartEvolucion) chartEvolucion.destroy();
    
    chartEvolucion = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses.map(m => {
                const [year, month] = m.split('-');
                return `${month}/${year}`;
            }),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Número de valoraciones' }
                },
                x: {
                    title: { display: true, text: 'Mes' }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12, 
                        font: { size: 10 },
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

function graficarPesoTalla() {
    const ctx = document.getElementById('chartPesoTalla');
    if (!ctx) return;
    
    const estadoFiltrado = document.getElementById('nutricionalFilterEstado')?.value || '';
    
    // Agrupar puntos por estado
    const puntosPorEstado = {};
    
    datosNutricionalesFiltrados
        .filter(d => d.peso && d.talla)
        .forEach(d => {
            if (!puntosPorEstado[d.categoriaEstado]) {
                puntosPorEstado[d.categoriaEstado] = [];
            }
            puntosPorEstado[d.categoriaEstado].push({
                x: d.talla,
                y: d.peso,
                nombre: d.nombre,
                uds: d.udsName,
                contrato: d.contract
            });
        });
    
    // Crear datasets por estado
    const datasets = Object.entries(puntosPorEstado).map(([estado, puntos]) => ({
        label: getNombreEstado(estado),
        data: puntos,
        backgroundColor: getColorPorCategoria(estado),
        pointRadius: 7,
        pointHoverRadius: 10,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointStyle: estado === 'severa' || estado === 'moderada' ? 'triangle' : 
                    estado === 'obesidad' ? 'rect' : 'circle'
    }));
    
    if (chartPesoTalla) chartPesoTalla.destroy();
    
    chartPesoTalla = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    title: { display: true, text: 'Talla (cm)', font: { weight: 'bold' } },
                    min: 45,
                    max: 135,
                    grid: { color: 'rgba(0,0,0,0.1)' }
                },
                y: { 
                    title: { display: true, text: 'Peso (kg)', font: { weight: 'bold' } },
                    min: 0,
                    max: 35,
                    grid: { color: 'rgba(0,0,0,0.1)' }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12, 
                        font: { size: 10 },
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                `${point.nombre}`,
                                `Peso: ${point.y} kg`,
                                `Talla: ${point.x} cm`,
                                `UDS: ${point.uds}`,
                                `Contrato: ${point.contrato}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

function graficarCriticosPorUDS() {
    const ctx = document.getElementById('chartCriticosUDS');
    if (!ctx) return;
    
    const estadoFiltrado = document.getElementById('nutricionalFilterEstado')?.value || '';
    
    // Contar por UDS
    const porUDS = {};
    
    datosNutricionalesFiltrados.forEach(d => {
        // Si hay filtro de estado, solo contar ese estado
        // Si no, contar todos los críticos
        const incluir = estadoFiltrado ? 
            d.estadoNutricional.includes(estadoFiltrado) :
            ['severa', 'moderada', 'obesidad'].includes(d.categoriaEstado);
        
        if (incluir) {
            if (!porUDS[d.udsName]) {
                porUDS[d.udsName] = { total: 0, porContrato: {} };
            }
            porUDS[d.udsName].total++;
            porUDS[d.udsName].porContrato[d.contract] = (porUDS[d.udsName].porContrato[d.contract] || 0) + 1;
        }
    });
    
    const udsOrdenadas = Object.entries(porUDS)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10);
    
    // Crear gradientes de color según cantidad
    const maxCount = Math.max(...udsOrdenadas.map(([, data]) => data.total));
    
    if (chartCriticosUDS) chartCriticosUDS.destroy();
    
    chartCriticosUDS = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: udsOrdenadas.map(([uds]) => uds.length > 25 ? uds.slice(0, 25) + '...' : uds),
            datasets: [{
                label: estadoFiltrado || 'Casos Críticos',
                data: udsOrdenadas.map(([, data]) => data.total),
                backgroundColor: udsOrdenadas.map(([, data]) => {
                    const intensity = data.total / maxCount;
                    // Gradiente de rojo según intensidad
                    const r = Math.floor(231 - (231 - 192) * intensity);
                    const g = Math.floor(76 - 76 * intensity);
                    const b = Math.floor(60 - 60 * intensity);
                    return `rgb(${r}, ${g}, ${b})`;
                }),
                borderRadius: 6,
                borderWidth: 2,
                borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const udsData = udsOrdenadas[context.dataIndex][1];
                            const contratoInfo = Object.entries(udsData.porContrato)
                                .map(([c, count]) => `Contrato ${c}: ${count}`)
                                .join(', ');
                            return `Por contrato: ${contratoInfo}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Número de casos' }
                }
            }
        }
    });
}

function graficarPerimetroBraquial() {
    const ctx = document.getElementById('chartPerimetroBraquial');
    if (!ctx) return;
    
    // Rangos de perímetro braquial según OMS (0-5 años)
    const rangos = {
        '< 11.5 cm (Desnutrición Aguda)': 0,
        '11.5 - 12.5 cm (Riesgo)': 0,
        '12.5 - 13.5 cm (Normal)': 0,
        '> 13.5 cm (Adecuado)': 0,
        'Sin datos': 0
    };
    
    const colores = {
        '< 11.5 cm (Desnutrición Aguda)': '#C0392B',
        '11.5 - 12.5 cm (Riesgo)': '#F39C12',
        '12.5 - 13.5 cm (Normal)': '#27AE60',
        '> 13.5 cm (Adecuado)': '#2980B9',
        'Sin datos': '#95A5A6'
    };
    
    datosNutricionalesFiltrados.forEach(d => {
        if (!d.perimetroBraquial) {
            rangos['Sin datos']++;
        } else if (d.perimetroBraquial < 11.5) {
            rangos['< 11.5 cm (Desnutrición Aguda)']++;
        } else if (d.perimetroBraquial < 12.5) {
            rangos['11.5 - 12.5 cm (Riesgo)']++;
        } else if (d.perimetroBraquial < 13.5) {
            rangos['12.5 - 13.5 cm (Normal)']++;
        } else {
            rangos['> 13.5 cm (Adecuado)']++;
        }
    });
    
    const labels = Object.keys(rangos).filter(l => rangos[l] > 0);
    const data = labels.map(l => rangos[l]);
    const backgroundColor = labels.map(l => colores[l]);
    
    if (chartPerimetro) chartPerimetro.destroy();
    
    chartPerimetro = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed.y || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} niños (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Número de niños' }
                }
            }
        }
    });
}

function renderizarAccordionEstados() {
    const container = document.getElementById('accordionEstados');
    if (!container) return;
    
    // Agrupar por estado
    const porEstado = {};
    datosNutricionalesFiltrados.forEach(d => {
        if (!porEstado[d.estadoNutricional]) {
            porEstado[d.estadoNutricional] = [];
        }
        porEstado[d.estadoNutricional].push(d);
    });
    
    // Ordenar por criticidad
    const ordenEstados = [
        'Desnutrición Aguda Severa',
        'Desnutrición Aguda Moderada',
        'Riesgo de Desnutrición',
        'Peso Normal',
        'Riesgo de Sobrepeso',
        'Sobrepeso',
        'Obesidad',
        'Sin datos'
    ];
    
    let html = '';
    ordenEstados.forEach(estado => {
        if (porEstado[estado] && porEstado[estado].length > 0) {
            const ninos = porEstado[estado];
            const categoria = ninos[0].categoriaEstado;
            const icono = getIconoEstado(categoria);
            const color = getColorPorCategoria(categoria);
            
            // Análisis por contrato
            const porContrato = {};
            ninos.forEach(n => {
                porContrato[n.contract] = (porContrato[n.contract] || 0) + 1;
            });
            
            const analisisContratos = Object.entries(porContrato)
                .sort((a, b) => b[1] - a[1])
                .map(([c, count]) => `<span style="color: ${COLORES_GRAFICAS.contratos[c]}; font-weight: 600;">Contrato ${c}: ${count}</span>`)
                .join(' | ');
            
            html += `
                <div class="accordion-item-nutricional estado-${categoria}" style="border-left: ${COLORES_GRAFICAS.estadoBorde[categoria]};">
                    <div class="accordion-header-nutricional" onclick="toggleAccordion(this)">
                        <div class="accordion-title-nutricional">
                            <div class="estado-icono" style="background: ${color}20; color: ${color};">${icono}</div>
                            <div>
                                <span class="estado-nombre" style="color: ${color};">${estado}</span>
                                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${analisisContratos}</div>
                            </div>
                            <span class="estado-cantidad" style="background: ${color}; color: white;">${ninos.length} niños</span>
                        </div>
                        <svg class="accordion-arrow w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                    <div class="accordion-content-nutricional">
                        <div class="accordion-body-nutricional">
                            <div class="ninos-grid-estado">
                                ${ninos.map(nino => renderizarCardNino(nino)).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = html || '<p class="text-center text-slate-500 py-4">No hay datos para mostrar con los filtros aplicados</p>';
}

function renderizarCardNino(nino) {
    const badgeTipo = nino.tipo === 'activa' ? 
        '<span class="nino-badge activa">ACTIVA</span>' : 
        '<span class="nino-badge archivada">ARCHIVADA</span>';
    
    const colorEstado = getColorPorCategoria(nino.categoriaEstado);
    
    return `
        <div class="nino-card-estado" style="border-left: 3px solid ${colorEstado};">
            <div class="nino-card-header">
                <span class="nino-nombre">${nino.nombre?.toUpperCase() || 'SIN NOMBRE'}</span>
                ${badgeTipo}
            </div>
            <div class="nino-datos">
                <div class="nino-dato">
                    <span class="nino-dato-label">📄 Documento</span>
                    <span class="nino-dato-valor">${nino.tipoDoc} ${nino.documento}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">🎂 Edad</span>
                    <span class="nino-dato-valor">${nino.edad}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">⚖️ Peso</span>
                    <span class="nino-dato-valor" style="color: ${colorEstado}; font-weight: 700;">${nino.peso ? nino.peso + ' kg' : '-'}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">📏 Talla</span>
                    <span class="nino-dato-valor" style="color: ${colorEstado}; font-weight: 700;">${nino.talla ? nino.talla + ' cm' : '-'}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">💪 Perímetro Braquial</span>
                    <span class="nino-dato-valor">${nino.perimetroBraquial ? nino.perimetroBraquial + ' cm' : '-'}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">🏫 UDS</span>
                    <span class="nino-dato-valor" style="font-size: 10px;">${nino.udsName}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">📋 Contrato</span>
                    <span class="nino-dato-valor" style="color: ${COLORES_GRAFICAS.contratos[nino.contract] || '#64748b'}; font-weight: 600;">${nino.contract}</span>
                </div>
                <div class="nino-dato">
                    <span class="nino-dato-label">📅 Valoración</span>
                    <span class="nino-dato-valor">${nino.fechaValoracion || '-'}</span>
                </div>
            </div>
            <div class="nino-actions" onclick="event.stopPropagation()">
                <button class="btn-ver-grafica" onclick="verGraficaIndividual('${nino.id}', '${nino.tipo}')">
                    📊 Ver Gráfica OMS
                </button>
                <button class="btn-ver-detalles" onclick="verDetalleNino('${nino.id}', '${nino.tipo}')">
                    👁️ Ver Detalles
                </button>
            </div>
        </div>
    `;
}

function renderizarTablaNutricional() {
    const tbody = document.getElementById('tbodyNutricional');
    const countEl = document.getElementById('nutricionalCount');
    if (!tbody) return;
    
    countEl.textContent = `${datosNutricionalesFiltrados.length} registros encontrados`;
    
    const start = (paginaNutricional - 1) * itemsPorPaginaNutricional;
    const paginados = datosNutricionalesFiltrados.slice(start, start + itemsPorPaginaNutricional);
    
    tbody.innerHTML = paginados.map(n => {
        const estadoClass = `estado-${n.categoriaEstado}-cell`;
        const badgeTipo = n.tipo === 'activa' ? 
            '<span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #93c5fd;">ACTIVA</span>' :
            '<span class="badge" style="background: rgba(100, 116, 139, 0.2); color: #94a3a8;">ARCHIVADA</span>';
        
        const colorEstado = getColorPorCategoria(n.categoriaEstado);
        
        return `
            <tr style="border-left: 3px solid ${colorEstado};">
                <td><span class="estado-cell ${estadoClass}" style="background: ${colorEstado}20; color: ${colorEstado}; border: 1px solid ${colorEstado};">${getIconoEstado(n.categoriaEstado)} ${n.estadoNutricional}</span></td>
                <td>${badgeTipo}</td>
                <td><span class="badge" style="background: ${COLORES_GRAFICAS.contratos[n.contract] || '#64748b'}; color: white;">${n.contract}</span></td>
                <td>${n.udsName}</td>
                <td><strong style="color: #fbbf24;">${n.nombre?.toUpperCase() || 'N/A'}</strong></td>
                <td>${n.tipoDoc} ${n.documento}</td>
                <td>${n.edad}</td>
                <td style="color: #fbbf24; font-weight: 700;">${n.peso ? n.peso + ' kg' : '-'}</td>
                <td style="color: #fbbf24; font-weight: 700;">${n.talla ? n.talla + ' cm' : '-'}</td>
                <td><span style="color: ${colorEstado}; font-weight: 600;">${n.estadoNutricional}</span></td>
                <td>
                    <button onclick="verGraficaIndividual('${n.id}', '${n.tipo}')" class="text-emerald-400 hover:text-emerald-300 text-xs font-bold mr-2" style="background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 4px;">📊 OMS</button>
                    <button onclick="verDetalleNino('${n.id}', '${n.tipo}')" class="text-blue-400 hover:text-blue-300 text-xs font-bold" style="background: rgba(59, 130, 246, 0.1); padding: 4px 8px; border-radius: 4px;">Ver</button>
                </td>
            </tr>
        `;
    }).join('');
    
    renderizarPaginacionNutricional();
}

function renderizarPaginacionNutricional() {
    const container = document.getElementById('paginationNutricional');
    if (!container) return;
    
    const totalPages = Math.ceil(datosNutricionalesFiltrados.length / itemsPorPaginaNutricional);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botón anterior
    html += `
        <button onclick="cambiarPaginaNutricional(${paginaNutricional - 1})" 
            class="px-3 py-1 rounded text-sm ${paginaNutricional === 1 ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}"
            ${paginaNutricional === 1 ? 'disabled' : ''}>
            ←
        </button>
    `;
    
    // Páginas
    const maxVisible = 5;
    let startPage = Math.max(1, paginaNutricional - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<button onclick="cambiarPaginaNutricional(1)" class="px-3 py-1 rounded text-sm bg-slate-200 text-slate-700 hover:bg-slate-300">1</button>`;
        if (startPage > 2) html += `<span class="px-2">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button onclick="cambiarPaginaNutricional(${i})" 
                class="px-3 py-1 rounded text-sm ${i === paginaNutricional ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="px-2">...</span>`;
        html += `<button onclick="cambiarPaginaNutricional(${totalPages})" class="px-3 py-1 rounded text-sm bg-slate-200 text-slate-700 hover:bg-slate-300">${totalPages}</button>`;
    }
    
    // Botón siguiente
    html += `
        <button onclick="cambiarPaginaNutricional(${paginaNutricional + 1})" 
            class="px-3 py-1 rounded text-sm ${paginaNutricional === totalPages ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}"
            ${paginaNutricional === totalPages ? 'disabled' : ''}>
            →
        </button>
    `;
    
    container.innerHTML = html;
}

function cambiarPaginaNutricional(pagina) {
    const totalPages = Math.ceil(datosNutricionalesFiltrados.length / itemsPorPaginaNutricional);
    if (pagina < 1 || pagina > totalPages) return;
    
    paginaNutricional = pagina;
    renderizarTablaNutricional();
    
    // Scroll al inicio de la tabla
    document.getElementById('tablaNutricional')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleAccordion(header) {
    const item = header.parentElement;
    const wasActive = item.classList.contains('active');
    
    // Cerrar todos
    document.querySelectorAll('.accordion-item-nutricional').forEach(i => i.classList.remove('active'));
    
    // Abrir el clickeado si no estaba activo
    if (!wasActive) {
        item.classList.add('active');
    }
}

function verGraficaIndividual(id, tipo) {
		const nino = tipo === 'activa' ? 
			datosNutricionales.find(d => d.id === id && d.tipo === 'activa') :
			datosNutricionales.find(d => d.id === id && d.tipo === 'archivada');
		
		if (!nino) {
			showToast('No se encontró el registro del niño', 'error');
			return;
		}
		
		if (!nino.peso || !nino.talla) {
			showToast('No hay datos de peso/talla suficientes para generar la gráfica OMS', 'warning');
			return;
		}
		
		const modal = document.getElementById('modalGraficaIndividual');
		
		// Abrir modal primero
		modal.classList.add('active');
		document.body.classList.add('modal-open');
		
		// Dibujar la gráfica usando la función unificada (que ahora usa el mismo código que el formulario)
		setTimeout(() => {
			dibujarGraficaIndividualCanvas(nino);
		}, 150);
	}

function dibujarGraficaIndividualCanvas(nino) {
		if (!nino) {
			console.error('No se proporcionó datos del niño');
			return;
		}
		
		if (!nino.peso || !nino.talla || !nino.genero) {
			console.error('Datos incompletos del niño:', nino);
			showToast('No hay datos de peso/talla suficientes para generar la gráfica OMS', 'warning');
			return;
		}
		
		const peso = parseFloat(nino.peso);
		const talla = parseFloat(nino.talla);
		const genero = nino.genero;
		
		// Calcular edad en meses
		let edadMeses = null;
		if (nino.edad) {
			edadMeses = parseEdadAMeses(nino.edad);
		} else if (nino.fechaNacimiento) {
			const hoy = new Date();
			const nacimiento = new Date(nino.fechaNacimiento);
			edadMeses = Math.floor((hoy - nacimiento) / (1000 * 60 * 60 * 24 * 30.44));
		}
		
		// Datos extra para mostrar
		const datosExtra = {
			uds: nino.udsName,
			contrato: nino.contract,
			estadoNutricional: nino.estadoNutricional
		};
		
		// Dibujar usando la función unificada - ESTO ES LO CLAVE
		dibujarGraficaOMS('omsChartIndividual', genero, peso, talla, edadMeses, nino.nombre, datosExtra);
		
		// Actualizar título y subtítulo del modal admin
		const title = document.getElementById('modalIndividualTitle');
		const subtitle = document.getElementById('modalIndividualSubtitle');
		
		if (title) {
			title.textContent = `Gráfica OMS - ${nino.nombre?.toUpperCase() || 'Niño'}`;
		}
		
		if (subtitle) {
			const estado = calcularRangoOMS(talla, peso, genero, edadMeses);
			let edadTexto = edadMeses ? ` • ${Math.floor(edadMeses/12)}a ${edadMeses%12}m` : '';
			subtitle.innerHTML = `${nino.tipoDoc} ${nino.documento} • ${nino.edad || '-'}${edadTexto} • <strong style="color: ${estado.color}">${estado.nombre}</strong>`;
		}
		
		// Actualizar info bar
		const infoBar = document.getElementById('infoNinoBar');
		if (infoBar) {
			const colorEstado = getColorPorCategoria(nino.categoriaEstado);
			
			infoBar.innerHTML = `
				<div class="info-nino-item">
					<span class="info-nino-label">⚖️ Peso</span>
					<span class="info-nino-valor" style="color: #fbbf24; font-size: 18px;">${peso} kg</span>
				</div>
				<div class="info-nino-item">
					<span class="info-nino-label">📏 Talla</span>
					<span class="info-nino-valor" style="color: #fbbf24; font-size: 18px;">${talla} cm</span>
				</div>
				<div class="info-nino-item">
					<span class="info-nino-label">📊 Estado</span>
					<span class="info-nino-valor" style="color: ${colorEstado}; font-size: 16px;">${nino.estadoNutricional || 'No calculado'}</span>
				</div>
				<div class="info-nino-item">
					<span class="info-nino-label">💪 Perímetro Braquial</span>
					<span class="info-nino-valor">${nino.perimetroBraquial ? nino.perimetroBraquial + ' cm' : 'No registrado'}</span>
				</div>
				<div class="info-nino-item">
					<span class="info-nino-label">🏫 UDS</span>
					<span class="info-nino-valor" style="font-size: 12px;">${nino.udsName}</span>
				</div>
				<div class="info-nino-item">
					<span class="info-nino-label">📋 Contrato</span>
					<span class="info-nino-valor" style="color: ${COLORES_GRAFICAS.contratos[nino.contract] || '#64748b'};">${nino.contract}</span>
				</div>
			`;
		}
	}

function llenarLeyendaIndividual() {
		const container = document.getElementById('leyendaIndividual');
		if (!container) return;
		
		// Leyenda actualizada para tablas 2-5 años
		//PANEL ADMINISTRATIVO INFO INDIVIDUAL
			const rangos = [
				{ nombre: 'Desnutrición Severa (<-3DE)', color: '#C0392B', de: '< -3DE', desc: 'Intervención inmediata' },
				{ nombre: 'Desnutrición Moderada', color: '#E74C3C', de: '-3DE a -2DE', desc: 'Seguimiento cercano' },
				{ nombre: 'Riesgo Desnutrición', color: '#F39C12', de: '-2DE a -1DE', desc: 'Monitoreo preventivo' },
				{ nombre: 'Peso Adecuado (Mediana)', color: '#27AE60', de: '-1DE a +1DE', desc: 'Estado óptimo' },
				{ nombre: 'Riesgo Sobrepeso', color: '#F1C40F', de: '+1DE a +1.5DE', desc: 'Vigilar alimentación' },
				{ nombre: 'Sobrepeso', color: '#E67E22', de: '+1.5DE a +2DE', desc: 'Ajustar dieta/actividad' },
				{ nombre: 'Obesidad (>+2DE)', color: '#8E44AD', de: '> +2DE', desc: 'Intervención nutricional' }
			];
		
		container.innerHTML = rangos.map(r => `
			<div class="leyenda-item" style="background: ${r.color}15; border: 2px solid ${r.color}; border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 10px; transition: transform 0.2s;">
				<div style="width: 24px; height: 24px; border-radius: 50%; background: ${r.color}; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
				<div style="flex: 1;">
					<div style="font-weight: 700; font-size: 13px; color: ${r.color};">${r.nombre}</div>
					<div style="font-size: 11px; color: #64748b; line-height: 1.3;">${r.de} • ${r.desc}</div>
				</div>
			</div>
		`).join('');
	}

function cerrarModalIndividual(event) {
		if (event && event.target.closest('.modal-grafica-content')) return;
		
		const modal = document.getElementById('modalGraficaIndividual');
		modal.classList.remove('active');
		document.body.classList.remove('modal-open');
		
		// Limpiar canvas (no destruir Chart.js porque ahora usamos canvas nativo)
		const canvas = document.getElementById('omsChartIndividual');
		if (canvas) {
			const ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	}

function verDetalleNino(id, tipo) {
		const nino = tipo === 'activa' ? 
			currentNovelties.find(n => n.id === id) :
			archivedNovelties.find(n => n.id === id);
		
		if (nino) {
			viewNoveltyDetails(nino, tipo === 'archivada');
		} else {
			showToast('No se encontró el registro completo', 'error');
		}
	}

function refreshNutricionalData() {
    showToast('🔄 Actualizando datos...', 'info');
    cargarDatosNutricionales();
}

document.addEventListener('DOMContentLoaded', () => {
    const tabBtn = document.getElementById('tab-nutricional');
    if (tabBtn) {
        tabBtn.addEventListener('click', () => {
            // Siempre recargar en base a la asociación/contrato actualmente
            // activo. Antes se usaba "if (datosNutricionales.length === 0)",
            // lo cual evitaba la recarga si ya había datos en memoria de
            // OTRA asociación, mostrando datos nutricionales incorrectos
            // al cambiar de panel administrativo.
            initNutricionalSection();
        });
    }
    
    // Event listeners para filtros en tiempo real
    ['nutricionalFilterContract', 'nutricionalFilterEstado', 'nutricionalFilterTipo', 
     'nutricionalFilterCritico', 'nutricionalFilterMes'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', filterNutricionalData);
        }
    });
    
    const searchElement = document.getElementById('nutricionalSearch');
    if (searchElement) {
        searchElement.addEventListener('input', debounce(filterNutricionalData, 300));
    }
});

function getColorPorEstadoNutricional(estadoNutricional) {
			if (!estadoNutricional || estadoNutricional === 'Sin datos') return '#95A5A6';
			
			// Normalizar el texto para comparación
			const estado = estadoNutricional.toLowerCase();
			
			// Desnutrición severa - Rojo oscuro
			if (estado.includes('severa')) return '#C0392B';
			
			// Desnutrición moderada - Rojo
			if (estado.includes('moderada')) return '#E74C3C';
			
			// Riesgo de desnutrición - Naranja
			if (estado.includes('riesgo') && estado.includes('desnutrición')) return '#F39C12';
			
			// Peso Normal - VERDE (este es el caso de la imagen)
			if (estado.includes('normal')) return '#27AE60';
			
			// Riesgo de sobrepeso - Amarillo
			if (estado.includes('riesgo') && estado.includes('sobrepeso')) return '#F1C40F';
			
			// Sobrepeso - Naranja oscuro
			if (estado.includes('sobrepeso')) return '#E67E22';
			
			// Obesidad - Púrpura
			if (estado.includes('obesidad')) return '#8E44AD';
			
			// Por defecto, gris
			return '#95A5A6';
		}

function getColorCurvaDE(index) {
			// index 0 = -3DE, 1 = -2DE, 2 = -1DE, 3 = Mediana, 4 = +1DE, 5 = +2DE, 6 = +3DE
			const colores = ['#C0392B', '#E74C3C', '#F39C12', '#27AE60', '#F1C40F', '#E67E22', '#8E44AD'];
			return colores[index] || '#95A5A6';
		}

function inicializarGraficaOMS() {
            // Placeholder para inicialización de gráfica
            console.log('Gráfica OMS inicializada');
        }

function abrirModalGraficaOMSAdmin() {
			const modal = document.getElementById('modalGraficaOMS');
			const GeneroInput = document.querySelector('input[name="_ingresoGender"]:checked');
			
			if (!GeneroInput) {
				showToast('Seleccione el género del beneficiario primero', 'warning');
				return;
			}
			
			document.body.classList.add('modal-open');
			
			const Genero = GeneroInput.value;
			const content = modal.querySelector('.modal-grafica-content');
			
			content.classList.remove('boy', 'girl');
			content.classList.add(Genero === 'M' ? 'boy' : 'girl');
			
			const Title = document.getElementById('modalGraficaTitle');
			const Icon = Genero === 'M' ? '👦' : '👧';
			Title.textContent = `Gráfica Peso/Talla OMS - ${Genero === 'M' ? 'NIÑOS' : 'NIÑAS'} ${Icon}`;
			
			modal.classList.add('active');
			
			requestAnimationFrame(() => {
				setTimeout(() => {
					dibujarGraficaEnModal(Genero);
				}, 100);
			});
		}
