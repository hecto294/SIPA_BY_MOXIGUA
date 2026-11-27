ruta = 'frontend/src/modules/coordinador/pages/CartasPresentacion.jsx'
with open(ruta, 'r', encoding='utf-8') as f:
    contenido = f.read()

# Buscamos el botón de "Ver" (que sabemos que existe) para insertar los de Aprobar/Rechazar justo antes
# En tu código, el botón de ver tiene onClick={() => handleVer(carta)}
marcador_ver = '<button onClick={() => handleVer(carta)}'
if marcador_ver not in contenido:
    # Buscamos variantes por si tiene clases
    import re
    match = re.search(r'<button[^>]*onClick=\{\(\) => handleVer\(carta\)\}[^>]*>', contenido)
    if match:
        marcador_ver = match.group(0)

if marcador_ver in contenido:
    # Insertamos los botones de Aprobar/Rechazar antes del botón de Ver
    botones_nuevos = """
                      {/* RF-101: Botones de cambio de estado */}
                      {carta.estado !== 'APROBADA' && (
                        <button
                          onClick={() => handleCambiarEstado(carta.id, 'APROBADA')}
                          style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}
                        >
                          <i className="fas fa-check" /> Aprobar
                        </button>
                      )}
                      {carta.estado !== 'RECHAZADA' && (
                        <button
                          onClick={() => handleCambiarEstado(carta.id, 'RECHAZADA')}
                          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}
                        >
                          <i className="fas fa-times" /> Rechazar
                        </button>
                      )}
                      """
    contenido = contenido.replace(marcador_ver, botones_nuevos + marcador_ver)
    with open(ruta, 'w', encoding='utf-8') as f:
        f.write(contenido)
    print('✅ Botones de Aprobar/Rechazar insertados correctamente.')
else:
    print('⚠️ No se encontró el botón de Ver. Revisa el archivo manualmente.')
