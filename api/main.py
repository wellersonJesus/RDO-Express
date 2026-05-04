from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RDO Express API")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def read_root():
    return {"status": "RDO Express API Online", "version": "1.0.0"}

# Endpoint temporário para teste de consumo de dados
@app.get("/usuarios")
def get_usuarios():
    # Aqui você conectará futuramente com a Planilha via App Script
    return [
        {"id": 1, "nome": "Wellerson"},
        {"id": 2, "nome": "Rodrigo Pereira"}
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
