# 🧬 Biologics Discovery Platform - Backend

This constitutes the backend core engine for the Biologics Discovery Platform.

## 🛠️ Tech Stack
- **Framework**: FastAPI (Asynchronous REST API)
- **Language**: Python 3.10+
- **Database**: MongoDB (via Beanie Object Document Mapper)
- **Background Tasks**: FastAPI Native `BackgroundTasks`
- **Scientific & AI Libraries**: RDKit, Biopython, XGBoost, Scikit-learn, PyTorch, NumPy, Pandas, AutoDock Vina

## 🚀 Installation & Setup
For complete installation, setup, and deployment instructions (including running the platform instantly with **Docker** and **Docker Compose** or via a manual Python virtual environment), please refer to the master [README.md](../README.md) in the workspace root directory.

### Quick Commands (Local Dev Environment):
1. **Activate virtual environment & install requirements**:
   ```bash
   python -m venv venv
   # Windows: venv\Scripts\activate  |  Linux/macOS: source venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Train AI model files**:
   ```bash
   python train_ai_model.py
   python app/ai_models/train_bbbp.py
   ```
3. **Launch the FastAPI app**:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

## 📂 Folder Structure
*   `app/`: Main application source code
    *   `api/`: API endpoints & routes (docking, screening, ADMET, pockets, etc.)
    *   `db/`: Database configuration, Beanie initialization, and collections
    *   `ml/`: ML featurization and model utilities
    *   `ai_models/`: Serialized model binaries (`.pkl`) and training scripts
    *   `models/`: Beanie document schemas & models
    *   `services/`: Core logic service handlers (UniProt API, etc.)
    *   `utils/`: Helper utilities (websockets, file parsers, docking engine)
*   `test_datasets/`: Sample datasets (`.smi`, `.csv`, `.sdf`, etc.) for validating the pipeline

## 📖 API Documentation
Once the server is running, visit [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive Swagger UI.

