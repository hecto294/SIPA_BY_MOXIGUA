ruta = 'frontend/src/modules/coordinador/pages/CartasPresentacion.jsx'
with open(ruta, 'r', encoding='utf-8') as f:
    contenido = f.read()

# El bloque exacto del botón de Ver (con el cierre del div)
# Buscamos el texto tal cual aparece en el archivo
viejo = """                      <button
                        onClick={() => handleVer(c)}
                        title="Ver"
                        style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        <i className="fas fa-eye" />
                      </button>"""

# Agregamos los botones de Aprobar/Rechazar antes del botón de Ver
nuevo = """                      {/* RF-101: Botones de cambio de estado */}
                      {c.estado !== 'APROBADA' && (
                        <button
                          onClick={() => handleCambiarEstado(c.id, 'APROBADA')}
                          title="Aprobar"
                          style={{
                            background: '#d1fae5',
                            color: '#047857',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          <i className="fas fa-check" />
                        </button>
                      )}
                      {c.estado !== 'RECHAZADA' && (
                        <button
                          onClick={() => handleCambiarEstado(c.id, 'RECHAZADA')}
                          title="Rechazar"
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          <i className="fas fa-times" />
                        </button>
                      )}

                      <button
                        onClick={() => handleVer(c)}
                        title="Ver"
                        style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        <i className="fas fa-eye" />
                      </button>"""

if viejo in contenido:
    contenido = contenido.replace(viejo, nuevo)
    with open(ruta, 'w', encoding='utf-8') as f:
        f.write(contenido)
    print('✅ Botones de Aprobar y Rechazar insertados correctamente.')
else:
    print('⚠️ No se encontró el bloque exacto. Revisa si el código cambió.')
