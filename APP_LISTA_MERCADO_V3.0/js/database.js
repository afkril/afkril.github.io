        // ==================== BASE DE DATOS ORIGINALES ====================
		
		const baseDatabase = {
			neiva: {
				titulo: "Regional Neiva",
				modalidades: {
					hcb: {
						titulo: "HCB - Hogares Comunitarios de Bienestar",
						db: [ 
							{"n":"Aceite","c":"granos","u":"ml","g":{"m1":13,"m2":14,"m3":15,"m4":14,"m5":14,"m6":15,"m7":14,"m8":15,"m9":14,"m10":13,"m11":14,"m12":18,"m13":10,"m14":10,"m15":12,"m16":14,"m17":14,"m18":14,"m19":14,"m20":13,"m21":15,"m22":11,"m23":15,"m24":26}},
							{"n":"Arroz","c":"granos","u":"gr","g":{"m1":23,"m2":23,"m3":46,"m4":23,"m5":48,"m6":23,"m7":23,"m9":48,"m10":23,"m11":23,"m12":23,"m13":23,"m14":25,"m15":48,"m16":23,"m17":23,"m18":23,"m19":23,"m20":23,"m21":23,"m22":23,"m23":23,"m24":73}},
							{"n":"Arveja seca","c":"granos","u":"gr","g":{"m2":10,"m9":10,"m20":10}},
							{"n":"Avena","c":"granos","u":"gr","g":{"m6":10,"m12":10,"m14":10,"m18":10,"m19":10,"m21":10,"m24":10}},
							{"n":"Azucar","c":"granos","u":"gr","g":{"m10":6,"m24":18}},
							{"n":"Cebada","c":"granos","u":"gr","g":{"m4":10}},
							{"n":"Cuchuco de trigo","c":"granos","u":"gr","g":{"m22":15}},
							{"n":"Frijol","c":"granos","u":"gr","g":{"m4":10,"m13":10,"m16":10,"m23":10}},
							{"n":"Harina de maiz","c":"granos","u":"gr","g":{"m3":25,"m4":25,"m6":25,"m10":25,"m15":25,"m17":25,"m18":25,"m19":25,"m20":25,"m23":25}},
							{"n":"Harina de trigo","c":"granos","u":"gr","g":{"m2":30,"m3":10,"m8":2,"m10":2,"m12":25,"m20":25,"m21":25,"m23":30}},
							{"n":"Lenteja","c":"granos","u":"gr","g":{"m1":10,"m7":10,"m15":10,"m24":10}},
							{"n":"Panela","c":"granos","u":"gr","g":{"m2":6,"m3":6,"m4":6,"m5":6,"m6":6,"m7":6,"m8":6,"m9":6,"m11":6,"m12":6,"m13":6,"m14":6,"m15":6,"m16":4,"m17":6,"m18":6,"m19":6,"m20":6,"m21":6,"m22":6}},
							{"n":"Pastas (Letras de sopa)","c":"granos","u":"gr","g":{"m12":2}},
							{"n":"Pastas (Espaguetis)","c":"granos","u":"gr","g":{"m8":23,"m14":23,"m24":23}},
							{"n":"Pastas fideos ","c":"granos","u":"gr","g":{"m2":4,"m9":4,"m10":5,"m15":1,"m17":1,"m18":10,"m24":5}},
							{"n":"Sal","c":"granos","u":"gr","g":{"m1":3,"m2":3,"m3":3,"m4":3,"m5":3,"m6":3,"m7":3,"m8":3,"m9":3,"m11":3,"m12":3,"m13":3,"m14":3,"m15":3,"m16":3,"m17":3,"m18":3,"m19":3,"m20":3,"m21":3,"m22":3,"m23":3,"m24":6}},
							{"n":"Huevo","c":"proteinas","u":"und","g":{"m1":1.00,"m2":1.19,"m3":1.11,"m4":1.00,"m5":1.00,"m6":1.00,"m7":1.00,"m8":1.11,"m9":1.00,"m10":1.02,"m11":1.00,"m12":1.02,"m13":1.00,"m14":1.00,"m15":1.00,"m16":1.00,"m17":1.00,"m18":1.00,"m19":1.00,"m20":1.09,"m21":1.09,"m22":1.00,"m23":1.09,"m24":2.00}},
							{"n":"Pechuga","c":"proteinas","u":"GRS","g":{"m2":43.01,"m5":43.01,"m8":43.01,"m12":43.01,"m17":43.01,"m19":43.01,"m22":43.01}},
							{"n":"Queso","c":"lacteos","u":"GRS","g":{"m2":10,"m4":10,"m5":10,"m6":10,"m10":10,"m12":10,"m15":20,"m17":10,"m18":10,"m19":10,"m20":20,"m23":30,"m24":30}},
							{"n":"Carne de cerdo","c":"proteinas","u":"GRS","g":{"m6":40,"m14":40,"m24":40}},
							{"n":"Carne de res ","c":"proteinas","u":"GRS","g":{"m4":40,"m9":40,"m13":40,"m16":40,"m18":40,"m20":40,"m21":40,"m23":40}},
							{"n":"Carne de res molida","c":"proteinas","u":"GRS","g":{"m1":40,"m7":40,"m15":40,"m24":40}},
							{"n":"Tilapia","c":"proteinas","u":"GRS","g":{"m3":64.52,"m10":64.52}},
							{"n":"Higado","c":"proteinas","u":"GRS","g":{"m11":40}},
							{"n":"Kumis","c":"lacteos","u":"und 150 cc","g":{"m11":1,"m20":1,"m22":1}},
							{"n":"Leche","c":"lacteos","u":"ml","g":{"m1":150,"m2":300,"m3":300,"m4":300,"m5":300,"m6":300,"m7":150,"m8":300,"m9":300,"m10":150,"m11":150,"m12":300,"m13":300,"m14":150,"m15":300,"m16":300,"m17":300,"m18":150,"m19":300,"m20":150,"m21":300,"m22":150,"m23":155,"m24":600}},
							{"n":"Yogurt","c":"lacteos","u":"und 150 cc","g":{"m1":1,"m7":1,"m10":1,"m14":1,"m18":1,"m23":1}},
							{"n":"Cucas","c":"panaderia","u":"und","g":{"m4":1,"m8":1,"m11":1,"m18":1,"m22":1}},
							{"n":"Galletas dulces","c":"panaderia","u":"und","g":{"m6":1,"m13":1,"m16":1}},
							{"n":"Mogolla","c":"panaderia","u":"und","g":{"m1":1,"m7":1,"m9":1,"m12":1,"m13":1,"m16":1}},
							{"n":"Pan de sal","c":"panaderia","u":"und","g":{"m2":1,"m7":1,"m10":1,"m11":1,"m14":1,"m17":1,"m19":1,"m21":1,"m24":1}},
							{"n":"Aguacate","c":"verduras","u":"gr","g":{"m13":65.5,"m16":19.48}},
							{"n":"Ahuyama","c":"verduras","u":"gr","g":{"m5":116.67}},
							{"n":"Ajo","c":"verduras","u":"gr","g":{"m1":2,"m2":0.53,"m3":0.53,"m4":0.53,"m5":1.53,"m6":1,"m7":0.53,"m8":0.53,"m11":1,"m12":1.06,"m13":0.53,"m14":0.53,"m15":1.05,"m16":0.53,"m17":0.53,"m18":0.53,"m19":0.53,"m20":0.53,"m21":0.53,"m22":0.53,"m23":1.06,"m24":2.5}},
							{"n":"Cebolla cabezona","c":"verduras","u":"gr","g":{"m1":7.26, "m2":12.53, "m3":6.32, "m4":25.16, "m5":21.06, "m6":21.06, "m7":2, "m8":15.26, "m9":5.26, "m11":15, "m12":10.53, "m13":4.10, "m14":14.53, "m15":2, "m16":4.10, "m17":10, "m18":3, "m19":5.26, "m20":9, "m22":10.53, "m23":6.21, "m24":28.42}},
							{"n":"Cebolla junca","c":"verduras","u":"gr","g":{"m1":10,"m2":5,"m3":15,"m4":5,"m5":5,"m6":5,"m7":2,"m8":5,"m9":7,"m10":2.5,"m11":2,"m12":15,"m13":2,"m14":5,"m15":2.5,"m16":2.5,"m17":2,"m18":11.5,"m19":5,"m20":2,"m21":5,"m22":14.75,"m23":5,"m24":12.5}},
							{"n":"Cilantro","c":"verduras","u":"gr","g":{"m1":3.33,"m2":1.11,"m7":1.11,"m9":2.1,"m12":2,"m13":1,"m14":1,"m15":2.22,"m16":1,"m18":1.11,"m20":2,"m22":1.11,"m23":1,"m24":3.33}},
							{"n":"Espinaca","c":"verduras","u":"gr","g":{"m6":83.33}},
							{"n":"Habichuela","c":"verduras","u":"gr","g":{"m5":44.44,"m8":16.67,"m11":16.67,"m12":5,"m17":16.67,"m18":4.44,"m19":5,"m22":8.88}},
							{"n":"Lechuga","c":"verduras","u":"gr","g":{"m1":18.18,"m12":18.18,"m19":36.36,"m22":18.18}},
							{"n":"Papa criolla","c":"verduras","u":"gr","g":{"m8":30,"m15":30,"m18":16.3,"m22":5.43}},
							{"n":"Papa pastusa","c":"verduras","u":"gr","g":{"m1":46.66,"m2":8.89,"m3":33.33,"m5":33.33,"m7":46.66,"m9":8.89,"m11":30,"m14":32.61,"m15":13.33,"m18":30,"m19":30,"m20":2,"m21":33.33,"m23":30,"m24":46.66}},
							{"n":"Pepino cohombro","c":"verduras","u":"gr","g":{"m2":20,"m9":26.67,"m14":20,"m15":26.67,"m18":26.67,"m20":26.67,"m21":20,"m23":13.33,"m24":20}},
							{"n":"Pimenton rojo","c":"verduras","u":"gr","g":{"m1":5.88,"m2":2,"m7":2.24,"m9":2,"m12":1.18,"m15":2.35,"m18":2,"m20":2.24,"m24":2.35}},
							{"n":"Platano maduro","c":"verduras","u":"gr","g":{"m1":34.72,"m2":41.67,"m4":41.67,"m6":41.67,"m8":34.72,"m10":41.67,"m13":41.67,"m20":41.67,"m24":41.67}},
							{"n":"Platano verde","c":"verduras","u":"gr","g":{"m4":4.41,"m5":36.76,"m12":44.12,"m13":4.41,"m16":36.76,"m17":44.12,"m22":44.12,"m23":4.41}},
							{"n":"Remolacha","c":"verduras","u":"gr","g":{"m24":20}},
							{"n":"Repollo","c":"verduras","u":"gr","g":{"m3":7.14,"m10":14.29}},
							{"n":"Tomate","c":"verduras","u":"gr","g":{"m1":18.75,"m2":18.75,"m3":26.25,"m4":30,"m5":25,"m6":18.75,"m7":38.75,"m8":21.25,"m9":25,"m10":12.5,"m11":10,"m12":36.25,"m13":5,"m14":35,"m15":34.2,"m16":17.65,"m17":3.75,"m18":31,"m19":31.25,"m20":32.5,"m21":25,"m22":30,"m23":32.5,"m24":68.75}},
							{"n":"Yuca","c":"verduras","u":"gr","g":{"m9":37.5,"m24":31.25}},{"n":"Zanahoria ","c":"verduras","u":"gr","g":{"m1":54.11,"m2":4.71,"m3":35.29,"m4":2.35,"m7":30.59,"m8":17.65,"m9":4.71,"m10":23.53,"m11":17.65,"m12":22.65,"m13":3.53,"m15":7.06,"m16":3.75,"m17":17.65,"m18":3.53,"m19":5,"m20":2.35,"m22":34.1,"m23":14.11,"m24":30.59}},
							{"n":"Banano","c":"frutas","u":"gr","g":{"m1":85.71,"m2":57.14,"m5":85.71,"m6":85.71,"m7":85.71,"m8":28.57,"m11":85.71,"m12":28.57,"m13":85.71,"m16":85.71,"m17":85.71,"m21":85.71,"m23":85.71,"m24":28.57}},
							{"n":"Fresa","c":"frutas","u":"gr","g":{"m1":21.05,"m3":21.05}},
							{"n":"Guayaba","c":"frutas","u":"gr","g":{"m19":26.67}},
							{"n":"Limon","c":"frutas","u":"gr","g":{"m1":4,"m2":5,"m3":6,"m4":10,"m7":10,"m8":5,"m9":5,"m10":6,"m12":5,"m14":5,"m15":6,"m18":5,"m19":3,"m20":5,"m21":10,"m22":10,"m23":5,"m24":5}},
							{"n":"Mandarina","c":"frutas","u":"gr","g":{"m1":57.14,"m3":57.14,"m4":85.71,"m5":85.71,"m10":85.71,"m11":85.71,"m15":85.71,"m16":85.71,"m19":85.71,"m21":85.71}},
							{"n":"Mango","c":"frutas","u":"gr","g":{"m4":120,"m8":120,"m9":120,"m10":120,"m11":120,"m14":120,"m15":120,"m16":80,"m17":120,"m18":120,"m19":120,"m24":200}},
							{"n":"Manzana","c":"frutas","u":"gr","g":{"m5":70.59,"m19":70.59}},
							{"n":"Melon","c":"frutas","u":"gr","g":{"m12":120,"m17":120,"m22":120}},
							{"n":"Mora","c":"frutas","u":"gr","g":{"m2":22.22,"m10":22.22,"m13":22.22,"m16":22.22,"m24":22.22}},
							{"n":"Naranja","c":"frutas","u":"gr","g":{"m4":100,"m6":100,"m8":100,"m9":66.67,"m14":100,"m15":100,"m18":100,"m24":200}},
							{"n":"Papaya","c":"frutas","u":"gr","g":{"m1":57.14,"m2":85.71,"m3":57.14,"m7":85.71,"m9":28.57,"m10":57.14,"m12":85.71,"m20":85.71,"m21":85.71,"m22":85.71,"m24":57.14}},
							{"n":"Pera","c":"frutas","u":"gr","g":{"m22":70.59}},
							{"n":"Piña","c":"frutas","u":"gr","g":{"m2":109.09,"m3":109.09,"m6":109.09,"m8":72.73,"m9":109.09,"m13":72.73,"m14":109.09,"m18":109.09,"m20":109.91,"m23":72.73,"m24":109.09}},
							{"n":"Sandia","c":"frutas","u":"gr","g":{"m7":150,"m12":100,"m13":150,"m20":150,"m23":150}}
						]
					},
					cdi: {
						titulo: "CDI - Centro de Desarrollo Infantil",
						db: [
							{ "n": "Producto Neiva CDI panaderia", c: "panaderia", u: "und", g: { "m1": 1} },
							{ "n": "Producto Neiva CDI lacteos", c: "lacteos", u: "und", g: { "m1": 1} },
							{ "n": "Producto Neiva CDI proteinas", c: "proteinas", u: "und", g: { "m1": 1} },
							{ "n": "Producto Neiva CDI frutas", c: "frutas", u: "und", g: { "m1": 1} },
							{ "n": "Producto Neiva CDI verduras", c: "verduras", u: "und", g: { "m1": 1} },
						]
					},
					hi: {
						titulo: "HI - Hogar Infantil",
						db: [
							{ "n": "Producto Neiva HI panaderia", c: "panaderia", u: "und", g: { "m1": 1} },
							{ "n": "Producto Neiva HI lacteos", c: "lacteos", u: "und", g: { "m1": 1} },
							{ "n": "Producto Neiva HI proteinas", c: "proteinas", u: "und", g: { "m1": 1} },
							{ "n": "Producto Neiva HI frutas", c: "frutas", u: "und", g: { "m1": 1} },
							{ "n": "Producto Neiva HI verduras", c: "verduras", u: "und", g: { "m1": 1} },
						]
					}
				}
			},
			gaitana: {
				titulo: "Regional Gaitana",
				modalidades: {
					hcb: {
						titulo: "HCB - Hogares Comunitarios de Bienestar",
						db: [ 
							{ "n": "Aceite de soya", "c": "granos", "u": "ml", "g": { "m1": 14, "m2": 12, "m3": 14, "m4": 12, "m5": 8, "m6": 10, "m7": 9, "m8": 12, "m9": 10, "m10": 6,"m11":14, "m12":13, "m13":9, "m14":13, "m15":8, "m16":13, "m17":17, "m18":14, "m19":14, "m20":12 } },
							{ "n": "Arroz", "c": "granos", "u": "gr", "g": { "m1": 23, "m2": 23, "m3": 23, "m4": 23, "m5": 23, "m6": 23, "m7": 23, "m8": 23,"m10": 23, "m11":23, "m12":23, "m13":23, "m15":23, "m16":23, "m17":23, "m18":23, "m19":23, "m20":23 } },
							{ "n": "Arveja seca", c: "granos", u: "gr", "g": {"m19":25} },			  
							{ "n": "Ajonjoli", "c": "granos", "u": "gr", "g": { "m10": 23} },
							{ "n": "Avena", "c": "granos", "u": "gr", "g": { "m2": 10, "m6": 10,"m16":10, "m19":10} },
							{ "n": "Azucar", "c": "granos", "u": "gr", "g": { "m2": 6, "m4": 6, "m6": 3, "m8": 8, "m9": 3, "m10": 3, "m11":11, "m12":3, "m14":5, "m15":10, "m16":4, "m18":6, "m19":3, "m20":3 } },
							{ "n": "Cocoa", "c": "granos", "u": "gr", "g": { "m3": 4, "m12":6, "m17":6} },
							{ "n": "Cebada", "c": "granos", "u": "gr", "g": { "m8": 8, "m14":10} },
							{ "n": "Frijol", "c": "granos", "u": "gr", "g": { "m3": 10, "m18":10} },
							{ "n": "Harina de maiz", "c": "granos", "u": "gr", "g": { "m2": 25, "m4": 25, "m6": 25, "m8": 25, "m11":25, "m12":25, "m13":25, "m15":25, "m16":25, "m20":25} },
							{ "n": "Harina de trigo", "c": "granos", "u": "gr", "g": { "m3": 20, "m5": 10, "m9": 25, "m11":25, "m17":45, "m19":25, "m20":5} },
							{ "n": "Lenteja", "c": "granos", "u": "gr", "g": { "m8": 7, "m15":10} },
							{ "n": "Maiz trillado o Cuchuco", "c": "granos", "u": "gr", "g": { "m7": 10} },
							{ "n": "Panela", "c": "granos", "u": "gr", "g": { "m1": 4, "m2": 4, "m4": 4, "m5": 4, "m7": 4, "m8": 4, "m10": 4, "m13":5, "m14":6, "m16":2, "m19":3, "m20":4 } },
							{ "n": "Pasta Fideos", "c": "granos", "u": "gr", "g": { "m2": 3, "m8": 3, "m20":5} },
							{ "n": "Pasta Spaquetis", "c": "granos", "u": "gr", "g": { "m9": 18, "m14":23} },
							{ "n": "Pasta Tornillo", "c": "granos", "u": "gr", "g": { "m19": 23} },
							{ "n": "Pasta Sopa de Letras", "c": "granos", "u": "gr", "g": { "m10": 10} },
							{ "n": "Sal", "c": "granos", "u": "gr", "g": { "m1": 3, "m2": 3, "m3": 3, "m4": 3, "m5": 3, "m6": 3, "m7": 3, "m8": 3, "m9": 3, "m10": 3, "m11":2, "m12":2, "m13":2, "m14":2, "m15":2, "m16":2, "m17":2, "m18":2, "m19":2, "m20":2 } },
							{ "n": "Aguacate", "c": "verduras", "u": "gr", "g": { "m3": 38.96, "m10": 19.48, "m18":25.97} },
							{ "n": "Arracacha", "c": "verduras", "u": "gr", "g": { "m17": 18.75} },
							{ "n": "Apio", "c": "verduras", "u": "gr", "g": { "m11": 10} },
							{ "n": "Ahuyama", "c": "verduras", "u": "gr", "g": { "m5": 35.29, "m11":11.7} },
							{ "n": "Ajo", "c": "verduras", "u": "gr", "g": { "m5": 1.05, "m6": 1.05, "m7": 1.05, "m9": 1.05, "m10": 1.05, "m11":0.52, "m15":0.52, "m16":1.05, "m17":0.5, "m18":0.5, "m20":1.05} },
							{ "n": "Arveja Cascara", "c": "verduras", "u": "gr", "g": { "m2": 12.5, "m4": 5, "m6": 12.5, "m7": 7.5, "m13":10, "m16":12.5} },
							{ "n": "Cebolla cabezona", "c": "verduras", "u": "gr", "g": { "m1": 31.58, "m2": 21.05, "m3": 7.37, "m4": 10.53, "m5": 10.53, "m6": 10.53, "m7": 26.32, "m8": 15.79, "m9": 21.05, "m10": 10.53, "m11":10.5, "m12":15.7, "m13":10.5, "m14":10.52, "m15":15.78, "m16":10.5, "m18":25.78, "m19":5.26 } },
							{ "n": "Cebolla larga", "c": "verduras", "u": "gr", "g": { "m3": 13.33, "m6": 11.11, "m7": 6.67, "m8": 6.67, "m10": 6.67, "m11":15, "m12":27.5, "m13":27.5, "m14":17.5, "m15":2.5, "m16":20.2, "m17":12.5, "m19":17.5} },
							{ "n": "Cilantro", "c": "verduras", "u": "gr", "g": { "m3": 2.22,"m7": 2.22,"m8": 2.22,"m9": 2.22, "m11":3.33, "m13":3.33, "m15":3.33, "m17":2.22, "m18":3.33, "m19":3.33 } },
							{ "n": "espinaca", "c": "verduras", "u": "gr", "g": { "m17":16.66 } },
							{ "n": "Habichuela", "c": "verduras", "u": "gr", "g": { "m6": 11.11, "m13":16.6, "m16":16.66, "m19":11.11} },
							{ "n": "Lechuga", "c": "verduras", "u": "gr", "g": { "m2": 36.36, "m7": 18.18, "m12":27.2, "m17":18.18, "m18":9.09} },
							{ "n": "Papa criolla", "c": "verduras", "u": "gr", "g": { "m2": 25} },
							{ "n": "Papa Pastusa", "c": "verduras", "u": "gr", "g": { "m1": 27.78, "m3": 33.33,"m7": 27.78, "m11":15, "m12":30, "m13":30, "m17":33.33} },
							{ "n": "Pepino", "c": "verduras", "u": "gr", "g": { "m1": 26.67} },
							{ "n": "platano maduro", "c": "verduras", "u": "gr", "g": { "m3": 27.78, "m5": 41.67, "m7": 34.72, "m10": 27.78, "m15":41.66, "m16":41.66, "m19":41.66, "m20":41.66} },
							{ "n": "Platano verde", "c": "verduras", "u": "gr", "g": { "m4": 44.12, "m6": 36.76, "m9": 36.76, "m11":22, "m14":44.11, "m18":36.76} },
							{ "n": "Remolacha", "c": "verduras", "u": "gr", "g": { "m9": 18.75, "m20":25} },
							{ "n": "Maiz tierno, crudo", "c": "verduras", "u": "gr", "g": { "m1": 35} },
							{ "n": "Repollo", "c": "verduras", "u": "gr", "g": { "m4": 21.43, "m15":21.42} },
							{ "n": "Tomate", "c": "verduras", "u": "gr", "g": { "m1": 37.5, "m2": 18.75, "m3": 20, "m4": 12.5, "m6": 12.5, "m7": 25, "m8": 48.75, "m9": 12.5, "m10": 12.5, "m11":25, "m12":43.75, "m13":6.25, "m14":37.5, "m15":18.75, "m16":22.5, "m18":56.25, "m19":8.75 } },
							{ "n": "Yuca", "c": "verduras", "u": "gr", "g": { "m1": 37.5, "m7": 25, "m10": 31.25, "m11":5.88, "m14":31.25, "m18":37.5	 } },
							{ "n": "Zanahoria", "c": "verduras", "u": "gr", "g": { "m2": 17.65,"m6": 11.76, "m7": 5.88, "m8": 4.71, "m9": 17.65, "m12":5.88, "m13":17.64, "m14":17.64, "m15":11.76, "m16":17.64, "m17":5.88, "m19":11.76, "m20":23.5} },
							{ "n": "Banano", "c": "frutas", "u": "gr", "g": { "m1": 85.71, "m5": 85.71, "m7": 71.43, "m10": 42.86, "m12":85.7, "m14":85.71, "m16":85.71, "m17":85.71} },
							{ "n": "Guayaba", "c": "frutas", "u": "gr", "g": {"m13":26.6, "m20":80} },
							{ "n": "Fresa", "c": "frutas", "u": "gr", "g": { "m4": 10.53, "m10": 21.05, "m18":21} },
							{ "n": "Limon", "c": "frutas", "u": "gr", "g": { "m10": 2} },
							{ "n": "Lulo", "c": "frutas", "u": "gr", "g": {"m11":100, "m19":100} },
							{ "n": "Mandarina", "c": "frutas", "u": "gr", "g": { "m1": 85.71, "m9": 85.71, "m11":85.7, "m13":57.14, "m14":85.7, "m17":85.7, "m18":57.14} },
							{ "n": "Mango", "c": "frutas", "u": "gr", "g": { "m2": 120, "m4": 120, "m8": 120, "m9": 120, "m17":40, "m18":120, "m20":120} },
							{ "n": "Manzana", "c": "frutas", "u": "gr", "g": { "m3": 70.59, "m15":70.5} },
							{ "n": "Maracuya", "c": "frutas", "u": "gr", "g": { "m4": 187.5, "m4": 187.5, "m16":187.5} },
							{ "n": "Melon", "c": "frutas", "u": "gr", "g": { "m3": 120, "m6": 120, "m9": 120, "m13":120} },
							{ "n": "Mora", "c": "frutas", "u": "gr", "g": { "m2": 66.67, "m15":66.66} },
							{ "n": "Naranja", "c": "frutas", "u": "gr", "g": { "m3": 100, "m6": 86.33, "m12":100, "m13":100, "m14":100, "m16":100, "m18":100} },
							{ "n": "Papaya", "c": "frutas", "u": "gr", "g": { "m2": 85.71, "m4": 85.71, "m5": 85.71, "m6": 85.71, "m8": 85.71, "m10": 85.71, "m11":85.7, "m15":57.14, "m19":85.7} },
							{ "n": "Pera", "c": "frutas", "u": "gr", "g": { "m5": 70.59, "m19":70.5} },
							{ "n": "Piña", "c": "frutas", "u": "gr", "g": { "m4": 27.27, "m7": 90.91, "m12":109, "m15":36.36, "m17":109, "m20":109.09} },
							{ "n": "Sandia", "c": "frutas", "u": "gr", "g": { "m1": 150, "m7": 150} },
							{ "n": "Tomate de arbol", "c": "frutas", "u": "gr", "g": { "m8": 58.14} },
							{ "n":"Huevo","c":"proteinas","u":"und","g":{"m1":1.00,"m3":1.00,"m4":1.00,"m5":1.00,"m6":1.00,"m7":1.00,"m9":1.00,"m10":1.00,"m11":1.12,"m12":1.00,"m13":1.00,"m14":1.00,"m16":1.00,"m17":1.09,"m19":1.00,}},
							{ "n": "Molleja", "c": "proteinas", "u": "GRS", "g": { "m6": 40, "m16":40} },
							{ "n": "Higado", "c": "proteinas", "u": "GRS", "g": {"m13":40} },
							{ "n": "Pechuga", "c": "proteinas", "u": "GRS", "g": { "m1": 43.01,"m2": 26.88,"m5": 43.01,"m7": 43.01,"m8": 26.88, "m11":43.01, "m15":43.01, "m17":43.01, "m19":43.01} },
							{ "n": "Carne de Cerdo", "c": "proteinas", "u": "GRS", "g": { "m3": 40, "m8": 40, "m12":40, "m14":40, "m18":25} },
							{ "n": "Carne de Res", "c": "proteinas", "u": "GRS", "g": { "m2": 40, "m4": 40, "m9": 40, "m15":25, "m18":40} },
							{ "n": "Tilapia", "c": "proteinas", "u": "GRS", "g": { "m10": 48.39, "m20":64.5} },
							{ "n": "Queso", "c": "lacteos", "u": "GRS", "g": { "m4": 10, "m9": 10, "m11":10, "m12":10, "m13":5, "m15":10, "m16":10, "m20": 10,} },
							{ "n": "kumis ", "c": "lacteos", "u": "und 150 cc", "g": { "m1": 1,"m5": 1,"m10": 1, "m13":1} },
							{ "n": "yogurt", "c": "lacteos", "u": "und 150 cc", "g": { "m3": 1,"m6": 1,"m9": 1,"m11":1, "m18":1} },
							{ "n": "Leche", "c": "lacteos", "u": "ml", "g": { "m1": 170,"m2": 300,"m3": 150,"m4": 300,"m5": 150,"m6": 150,"m7": 300,"m8": 300,"m9": 150,"m10": 150, "m11":150, "m12":300, "m13":150, "m14":300, "m15":300, "m16":300, "m17":310, "m18":150, "m19":300, "m20":300} },
							{ "n": "Cucas", c: "panaderia", u: "und", g: { "m5": 1, "m13":1, "m15":1, "m20":1} },
							{ "n": "Pan Blanco", c: "panaderia", u: "und", g: { "m5": 1, "m6": 1, m7: 1, "m12":1} },
							{ "n": "Pan dulce", c: "panaderia", u: "und", g: { "m1": 1, "m10": 1, "m14":1, "m18":1} },
							{ "n": "Pan de yuca", c: "panaderia", u: "und", g: { "m8": 1} },
							{ "n": "Pandebono", c: "panaderia", u: "und", g: { "m4": 1,"m9": 1, "m16":1} },
							{ "n": "Pan de yuca", c: "panaderia", u: "und", g: { "m8": 1} },
							{ "n": "Ponque", c: "panaderia", u: "und", g: { "m2": 1} }
						]
					},
					cdi: {
						titulo: "CDI - Centro de Desarrollo Infantil",
						db: [
							{ "n": "Producto Gaitana CDI panaderia", c: "panaderia", u: "und", g: { "m1": 1} },
							{ "n": "Producto Gaitana CDI lacteos", c: "lacteos", u: "und", g: { "m1": 1} },
							{ "n": "Producto Gaitana CDI proteinas", c: "proteinas", u: "und", g: { "m1": 1} },
							{ "n": "Producto Gaitana CDI frutas", c: "frutas", u: "und", g: { "m1": 1} },
							{ "n": "Producto Gaitana CDI verduras", c: "verduras", u: "und", g: { "m1": 1} },
						]
					},
					hi: {
						titulo: "HI - Hogar Infantil",
						db: [
							{ "n": "Producto Gaitana HI panaderia", c: "panaderia", u: "und", g: { "m1": 1} },
							{ "n": "Producto Gaitana HI lacteos", c: "lacteos", u: "und", g: { "m1": 1} },
							{ "n": "Producto Gaitana HI proteinas", c: "proteinas", u: "und", g: { "m1": 1} },
							{ "n": "Producto Gaitana HI frutas", c: "frutas", u: "und", g: { "m1": 1} },
							{ "n": "Producto Gaitana HI verduras", c: "verduras", u: "und", g: { "m1": 1} },
						]
					}
				}
			}
		};

		// ==================== OPERADORES POR REGIONAL/MODALIDAD ====================
		// Cada operador arranca con un clon de la minuta base de su modalidad.
		// A futuro cada uno tendrá su propio gramaje/productos personalizados,
		// editables desde "Editor de Gramajes" (seleccionando el operador) o desde
		// "Cargue de Minuta por Operador".
		baseDatabase.neiva.modalidades.hcb.operadores = {
			jer: {
				titulo: 'HCB Neiva — Operador JER',
				nombre: 'JER',
				db: JSON.parse(JSON.stringify(baseDatabase.neiva.modalidades.hcb.db))
			},
			palmas: {
				titulo: 'HCB Neiva — Operador Palmas',
				nombre: 'Palmas',
				db: JSON.parse(JSON.stringify(baseDatabase.neiva.modalidades.hcb.db))
			}
		};

		baseDatabase.gaitana.modalidades.hcb.operadores = {
			t3: {
				titulo: 'HCB Gaitana — Operador T3',
				nombre: 'T3',
				db: JSON.parse(JSON.stringify(baseDatabase.gaitana.modalidades.hcb.db))
			},
			caguan: {
				titulo: 'HCB Gaitana — Operador Caguán',
				nombre: 'Caguán',
				db: JSON.parse(JSON.stringify(baseDatabase.gaitana.modalidades.hcb.db))
			},
			palmas: {
				titulo: 'HCB Gaitana — Operador Palmas',
				nombre: 'Palmas',
				db: JSON.parse(JSON.stringify(baseDatabase.gaitana.modalidades.hcb.db))
			}
		};

