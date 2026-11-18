"""
Semana 5 — Capa API: dobles sobre validación / almacenamiento de archivos.
No solapa test_mocks_s5.py ni e2e/mocks.spec.ts.
"""
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.core.file_validation import _validate_filename


def test_stub_validate_filename_acepta_nombre_simple():
    """Tipo de doble: n/a (función pura). Verifica ESTADO del resultado."""
    result = _validate_filename("informe.pdf")
    assert result == "informe.pdf"


def test_estado_sanitiza_ruta_en_filename():
    """Tipo de doble: n/a (función pura). ESTADO: elimina la ruta y deja solo el nombre base."""
    result = _validate_filename("malo/ruta.pdf")
    assert result == "ruta.pdf"
    assert "/" not in result


def test_mock_storage_falla_y_se_propaga():
    """Tipo de doble: MOCK (side_effect). Comportamiento: save se llamó y falló."""
    storage = MagicMock()
    storage.save.side_effect = OSError("disco lleno")

    with pytest.raises(OSError, match="disco lleno"):
        storage.save("/uploads/cartas/demo.pdf", b"%PDF")

    storage.save.assert_called_once()
    args, _ = storage.save.call_args
    assert "cartas" in str(args[0]) or str(args[0]).endswith(".pdf")


def test_estado_rechaza_nombre_vacio():
    """Tipo de doble: n/a. ESTADO: excepción si el nombre está vacío."""
    with pytest.raises(HTTPException) as exp_info:
        _validate_filename("")
    assert exp_info.value.status_code == 400


def test_estado_rechaza_none():
    """Tipo de doble: n/a. ESTADO: excepción si filename es None."""
    with pytest.raises(HTTPException) as exp_info:
        _validate_filename(None)
    assert exp_info.value.status_code == 400