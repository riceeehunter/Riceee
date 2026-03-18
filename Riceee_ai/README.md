# Riceee AI - Setup & Usage Guide

## 🤖 What is Riceee AI?

Riceee AI is your trained relationship conflict mediator. It's a fine-tuned Llama 3.2 1B model that provides empathetic, brutally honest, and Indian-context aware relationship advice.

## 📋 Prerequisites

- Python 3.8 or higher
- At least 4GB RAM (8GB+ recommended)
- (Optional) NVIDIA GPU for faster inference

## 🚀 Setup Instructions

### 1. Install Python Dependencies

```powershell
# Navigate to Riceee_ai folder
cd Riceee_ai

# Install dependencies
pip install -r requirements.txt
```

Or use the setup script:
```powershell
.\setup.ps1
```

### 2. Start the AI Server

```powershell
cd Riceee_ai
python riceee_api.py
```

You should see:
```
🚀 Starting Riceee AI API server...
📝 API will be available at: http://localhost:8000
🤖 Loading Riceee AI model...
✅ Model loaded on CPU (or GPU if available)
```

**Keep this terminal running!** The AI server needs to stay active.

### 3. Start Your Next.js App

In a **separate terminal**:
```powershell
npm run dev
```

## 💬 Using Riceee AI

1. Go to your dashboard at `http://localhost:3000/dashboard`
2. Click the **"Riceee AI"** button (purple gradient, next to calendar)
3. Fill in the conflict form:
   - Names (optional)
   - Scenario description
   - Your perspective
   - Partner's perspective
4. Click "Get Riceee's Advice"
5. Wait for AI-powered advice!

## 🔧 Troubleshooting

### "Model not loaded" error
- Make sure all model files are in the `Riceee_ai` folder
- Check that you have enough RAM
- Try restarting the Python server

### "Failed to get AI response"
- Ensure the Python server is running on port 8000
- Check the Python terminal for errors
- Verify `http://localhost:8000` is accessible

### Slow responses
- First request is slower (model loading)
- Subsequent requests are faster
- Consider using a GPU for 5-10x speedup

## 📁 Model Files

Your trained model includes:
- `model.safetensors` - The AI brain (trained weights)
- `config.json` - Model configuration
- `tokenizer.json` - Text processing
- `chat_template.jinja` - Chat formatting

## 🎯 How It Works

1. **User submits conflict** via chat UI
2. **Next.js API route** (`/api/riceee-ai`) receives request
3. **Python FastAPI server** processes with AI model
4. **Model generates advice** using your 250 training examples
5. **Response sent back** to chat UI

## 💡 Tips

- Be detailed in your conflict descriptions for better advice
- Include both perspectives for balanced mediation
- The AI learned from 250 examples - it knows your tone!
- Responses include **bold text** - render as Markdown for best display

## ⚙️ Technical Details

- **Model**: Llama 3.2 1B (fine-tuned with LoRA)
- **Training**: 250 relationship conflict examples, 3 epochs
- **Framework**: Unsloth + Transformers
- **API**: FastAPI (Python) + Next.js API Routes
- **Inference**: CPU/GPU with torch

## 🛑 Stopping the Servers

- **AI Server**: Press `Ctrl+C` in the Python terminal
- **Next.js**: Press `Ctrl+C` in the npm terminal

---

Made with 💜 by Riceee
