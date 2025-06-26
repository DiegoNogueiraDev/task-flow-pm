#!/usr/bin/env python3
"""
Bridge Python para integração com Docling
Converte documentos usando Docling e retorna JSON estruturado
"""

import sys
import json
import argparse
from pathlib import Path
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat

def convert_document(file_path: str, output_format: str = "markdown") -> dict:
    """
    Converte documento usando Docling
    
    Args:
        file_path: Caminho para o arquivo
        output_format: Formato de saída (markdown, html, json)
        
    Returns:
        Dict com conteúdo processado e metadados
    """
    try:
        converter = DocumentConverter()
        result = converter.convert(file_path)
        
        # Extrai conteúdo baseado no formato
        if output_format == "markdown":
            content = result.document.export_to_markdown()
        elif output_format == "html":
            content = result.document.export_to_html()
        else:
            content = result.document.export_to_json()
        
        # Extrai metadados úteis
        metadata = {
            "title": getattr(result.document, 'title', ''),
            "page_count": len(result.document.pages) if hasattr(result.document, 'pages') else 1,
            "tables_count": len([e for page in result.document.pages for e in page.elements if e.label == 'Table']) if hasattr(result.document, 'pages') else 0,
            "images_count": len([e for page in result.document.pages for e in page.elements if e.label == 'Picture']) if hasattr(result.document, 'pages') else 0,
            "text_length": len(content),
            "source_file": file_path
        }
        
        return {
            "success": True,
            "content": content,
            "metadata": metadata,
            "format": output_format
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "source_file": file_path
        }

def main():
    parser = argparse.ArgumentParser(description='Docling Bridge para Task Flow PM')
    parser.add_argument('file_path', help='Caminho para o arquivo a ser convertido')
    parser.add_argument('--format', choices=['markdown', 'html', 'json'], 
                       default='markdown', help='Formato de saída')
    
    args = parser.parse_args()
    
    # Converte documento
    result = convert_document(args.file_path, args.format)
    
    # Retorna JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
