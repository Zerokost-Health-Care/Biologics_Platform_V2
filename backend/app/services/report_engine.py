from fpdf import FPDF
from datetime import datetime
import os

class BioDiscoveryReport(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Biologics Discovery Platform - Analysis Report', 0, 1, 'C')
        self.ln(10)
        
    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_pdf_report(target_name: str, summary_data: dict, molecules: list):
    """
    Generates a PDF summary for scientific researchers.
    summary_data = { "pIC50_avg": 7.2, "top_hits": 5, "total_screened": 1000000 }
    """
    pdf = BioDiscoveryReport()
    pdf.add_page()
    pdf.set_font('Arial', '', 12)
    
    # Metadata
    pdf.cell(0, 10, f'Date: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 0, 1)
    pdf.cell(0, 10, f'Target: {target_name}', 0, 1)
    pdf.ln(5)
    
    # Discovery Summary
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'Discovery Summary', 0, 1)
    pdf.set_font('Arial', '', 12)
    for k, v in summary_data.items():
        pdf.cell(0, 10, f'{k.replace("_", " ").title()}: {v}', 0, 1)
    pdf.ln(5)
    
    # Top Hit Molecules
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'Top Hit Compounds', 0, 1)
    pdf.set_font('Arial', '', 10)
    
    # Table Header
    pdf.cell(40, 10, 'Rank', 1)
    pdf.cell(100, 10, 'SMILES', 1)
    pdf.cell(40, 10, 'Affinity (pIC50)', 1)
    pdf.ln()
    
    for i, mol in enumerate(molecules[:10]):
        # Alternate background logic could go here
        pdf.cell(40, 10, str(i + 1), 1)
        pdf.cell(100, 10, mol['smiles'][:40], 1)
        pdf.cell(40, 10, str(round(mol['affinity'], 2)), 1)
        pdf.ln()

    # Save to buffer or file
    filename = f"report_{target_name}_{os.urandom(2).hex()}.pdf"
    output_path = f"/tmp/{filename}" if os.name != 'nt' else f"./temp_uploads/{filename}"
    
    if not os.path.exists("./temp_uploads"):
        os.makedirs("./temp_uploads")
        
    pdf.output(output_path)
    return output_path
