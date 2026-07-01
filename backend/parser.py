from io import BytesIO
from pypdf import PdfReader

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Reads PDF bytes and returns extracted text content.
    """
    try:
        pdf_file = BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        full_text = []
        
        # Limit text extraction to first 5 pages to keep execution quick in demo
        num_pages = min(len(reader.pages), 5)
        for page_num in range(num_pages):
            page_text = reader.pages[page_num].extract_text()
            if page_text:
                full_text.append(page_text)
                
        return "\n".join(full_text)
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return ""
