import React, { useEffect, useState } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://monitorderuido-b8a20-default-rtdb.firebaseio.com/",
  apiKey: "AIzaSyCw9Uz9EqoRd_zSWTnVMaZdF_t5ywu7df8"
};

// Inicialización de la instancia de Firebase en el Cliente
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Parámetros de Calibración de Ruido Ambiental
const PUNTO_SILENCIO = 1905;  // Centro de oscilación calibrado de tu hardware
const LIMITE_PERMITIDO = 400; // Tolerancia máxima antes de considerarse infracción / ruido alto

function App() {
  const [historial, setHistorial] = useState([]);
  const [ultimoNivelReal, setUltimoNivelReal] = useState(0);

  useEffect(() => {
    // Referencia al nodo del historial estructurado en Firebase
    const historialRef = ref(db, 'historial_ruido');
    
    // Suscripción al flujo de datos en tiempo real
    onValue(historialRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Conversión del diccionario de Firebase (Key-Value) a Array común de JavaScript
        const listaConvertida = Object.keys(data).map(key => {
          const valorBruto = data[key];
          
          // Cálculo del valor absoluto para unificar crestas y valles de la onda de audio
          const intensidadReal = Math.abs(valorBruto - PUNTO_SILENCIO);

          return {
            id: key,
            bruto: valorBruto,
            intensidad: intensidadReal
          };
        });
        
        // Extraemos únicamente las últimas 15 muestras para optimizar renderizado en pantalla
        const ultimasLecturas = listaConvertida.slice(-15);
        setHistorial(ultimasLecturas);

        // Actualizamos el medidor maestro con el dato más reciente en la lista
        if (ultimasLecturas.length > 0) {
          setUltimoNivelReal(ultimasLecturas[ultimasLecturas.length - 1].intensidad);
        }
      }
    });
  }, []);

  // Control centralizado del comportamiento del semáforo visual
  const obtenerColorMedidor = (intensidad) => {
    if (intensidad > LIMITE_PERMITIDO) return '#F44336'; // Rojo - Límite excedido
    if (intensidad >= 150) return '#FFC107';            // Amarillo - Alerta / Ruido Moderado
    return '#4CAF50';                                    // Verde - Nivel Seguro / Silencio
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '5px' }}>🎙️ Monitor de Ruido Ambiental</h2>
        <p style={{ textAlign: 'center', color: '#888', fontSize: '14px', marginTop: '0' }}>Nodo de Monitoreo IoT - Control en Tiempo Real</p>
        
        {/* --- CONTENEDOR EN TIEMPO REAL CON SEMÁFORO INTELIGENTE --- */}
        <div style={{ 
          textAlign: 'center', 
          margin: '30px 0', 
          padding: '20px', 
          borderRadius: '8px', 
          border: ultimoNivelReal > LIMITE_PERMITIDO ? '2px solid #F44336' : '1px solid #eee',
          backgroundColor: ultimoNivelReal > LIMITE_PERMITIDO ? '#FFF8F8' : 'transparent',
          transition: 'all 0.3s ease'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Intensidad de Ruido Actual
          </h4>
          
          <div style={{ fontSize: '54px', fontWeight: 'bold', color: obtenerColorMedidor(ultimoNivelReal) }}>
            {ultimoNivelReal} <span style={{ fontSize: '22px', color: '#666', fontWeight: 'normal' }}>unidades</span>
          </div>

          {/* Renderizado Condicional del Aviso Crítico de Exceso de Ruido */}
          {ultimoNivelReal > LIMITE_PERMITIDO && (
            <div style={{ color: '#F44336', fontWeight: 'bold', marginTop: '10px', fontSize: '15px' }}>
              ⚠️ ¡ALERTA: LÍMITE PERMITIDO EXCEDIDO!
            </div>
          )}
          
          {/* Barra Dinámica de Progreso */}
          <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: '10px', height: '25px', marginTop: '20px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${Math.min((ultimoNivelReal / 1200) * 100, 100)}%`, 
              backgroundColor: obtenerColorMedidor(ultimoNivelReal), 
              height: '100%', 
              transition: 'width 0.3s ease-in-out' 
            }} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#777', marginTop: '8px' }}>
            <span>0 (Silencio Base)</span>
            <span style={{ color: '#F44336', fontWeight: 'bold' }}>Límite Máximo ({LIMITE_PERMITIDO})</span>
          </div>
        </div>

        {/* --- PANEL DE HISTORIAL --- */}
        <div>
          <h3 style={{ color: '#444', borderBottom: '2px solid #eee', paddingBottom: '8px' }}>
            📋 Historial Reciente (Últimas 15 muestras)
          </h3>
          <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '5px', padding: '10px', backgroundColor: '#fafafa' }}>
            {historial.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Esperando paquetes de datos del ESP32...</p>
            ) : (
              // Invertimos el array para visualizar el último cambio en la cabecera
              [...historial].reverse().map((registro) => (
                <div key={registro.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 5px', borderBottom: '1px solid #eee', fontSize: '14px' }}>
                  <span style={{ color: '#666', fontFamily: 'monospace' }}>ID: {registro.id.substring(0, 8)}</span>
                  <span style={{ color: '#888' }}>Lectura Bruta: {registro.bruto}</span>
                  <span style={{ fontWeight: 'bold', color: obtenerColorMedidor(registro.intensidad) }}>
                    Fuerza: {registro.intensidad}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;