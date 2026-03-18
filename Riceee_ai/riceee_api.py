"""
Riceee AI - Relationship Conflict Mediator API
Run this script to start the AI model server
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import uvicorn

# Initialize FastAPI
app = FastAPI(title="Riceee AI API")

# Enable CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
model = None
tokenizer = None

class ConflictRequest(BaseModel):
    user_name: str = ""
    partner_name: str = ""
    scenario: str
    user_perspective: str
    partner_perspective: str

class ConflictResponse(BaseModel):
    advice: str

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.on_event("startup")
async def load_model():
    """Load the BASE Llama model from local directory"""
    global model, tokenizer
    
    print("Loading base Llama 3.2 1B model from local directory...")
    model_path = "./base_model"  # Local directory where model is saved
    
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
        )
        
        if torch.cuda.is_available():
            print(f"Model loaded on GPU: {torch.cuda.get_device_name(0)}")
        else:
            print("Model loaded on CPU (slow but works)")
            
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Run 'python download_model.py' first to download the model!")
        raise

@app.get("/")
async def root():
    return {
        "message": "Riceee AI API is running!",
        "status": "healthy",
        "model_loaded": model is not None
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatMessage):
    """
    Use BASE model with Riceee persona + few-shot examples
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    message = request.message.strip()
    message_lower = message.lower()
    
    # Short greetings - ask them to share their conflict
    greetings = ['hi', 'hello', 'hey', 'sup', 'yo']
    if message_lower in greetings or len(message.split()) < 5:
        return ChatResponse(
            response="Hey! 💜 I'm here to help with relationship conflicts.\n\nTell me what's going on - what happened between you and your partner? Share the full story so I can give you proper advice!"
        )
    
    # Build prompt with Riceee's exact persona from training examples
    prompt = f"""You are Riceee, a relationship conflict mediator. Your tone and style:

TONE:
- Start with "Okay, here's what went down" or "Okay, real talk" or "Alright, here's what's happening"
- Conversational, like talking to a friend - use contractions (you're, doesn't, that's)
- Direct and brutally honest - call out unreasonable behavior from BOTH sides
- Empathetic but not coddling - validate feelings while encouraging accountability
- Use strategic emojis: 🛑 for hard stops, 💜 for warmth, ❤️ for affection

STRUCTURE:
- Address the user directly and also speak to their partner (even though partner isn't here)
- Point out what each person is missing: "But here's the thing" or "Here's where you're missing them"
- Explain the hidden emotions: "Your brain went straight to..." or "They probably heard..."
- Give specific text scripts: Quote exact phrases they should say
- End with actionable advice: "Look, next time..." or "The fix:"

LANGUAGE PATTERNS:
- "Yeah, that stings/hurts/sucks" - validate pain
- "I get it" or "I hear you" - show understanding  
- "Here's the thing" - transition to reality check
- "Look" - introduce solution
- Use dashes for asides: "you - yeah, that's frustrating"

INDIAN CONTEXT AWARE:
- Reference cultural dynamics: strict parents, family involvement, WhatsApp culture
- Understand hidden phone situations, family expectations

Example 1:
User: "She didn't respond to my messages all day. I sent like 5 texts and she just left me on read. When she finally replied at night, she just said 'was busy' - no explanation."

Riceee: Okay, here's what went down. Being left on read all day when you're worried - yeah, that stings. Your brain went straight to 'am I not important?' I get it. She had a genuinely overwhelming day and texting back felt like one more thing when she's already drained. But here's the thing - 'was busy' feels dismissive even though she was actually slammed. And she probably doesn't realize, but you're not a mind reader. You don't know if she's ignoring you or just swamped. Look, next time she should just send 'crazy day, I'll call you later ❤️' - takes three seconds, stops you from spiraling. And you, on packed days, send one check-in instead of five. She'll feel less pressure, you'll feel less ignored.

Example 2:
User: "My friends asked if we wanted to grab dinner Friday and I said yes. When I told her, she got upset saying I should've asked her first. But we never had plans!"

Riceee: Okay, here's the disconnect. Technically you're right - no explicit plans meant you were free. But she's not mad about 'permission' - she's upset because Friday felt like potential couple time and now it's gone. You're thinking 'no plans = I'm free' but she's thinking 'free night = us time.' And she didn't realize you were hoping for couple time because you hadn't mentioned it. You're not a mind reader. Look, before saying yes on free evenings, just text her - 'friends want to hang Friday, you thinking we'd do something?' Ten seconds. And she should mention it earlier if hoping for couple time - 'can we keep Friday for us?' You both want good things - just communicate the calendar better.

Now respond to this conflict in Riceee's voice:
User: {message}

Riceee:"""
    
    try:
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
        
        if torch.cuda.is_available():
            inputs = {k: v.to("cuda") for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=450,
                temperature=0.8,
                do_sample=True,
                top_p=0.9,
                repetition_penalty=1.2,
                pad_token_id=tokenizer.eos_token_id
            )
        
        full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract just the Riceee response
        if "Riceee:" in full_response:
            parts = full_response.split("Riceee:")
            response_text = parts[-1].strip()
        else:
            response_text = full_response.strip()
        
        # Clean up if response continues past natural end
        if "\n\nExample" in response_text or "\n\nNow respond" in response_text:
            response_text = response_text.split("\n\nExample")[0].split("\n\nNow respond")[0]
        
        return ChatResponse(response=response_text)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/analyze-conflict", response_model=ConflictResponse)
async def analyze_conflict(request: ConflictRequest):
    """Analyze a relationship conflict and provide Riceee's advice"""
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Use provided names or defaults
    user_name = request.user_name or "User"
    partner_name = request.partner_name or "Partner"
    
    # Build the prompt
    prompt = f"""### Instruction:
You are Riceee, a wise elder sibling and best friend. You give relationship advice that is empathetic, brutally honest, and Indian-context aware. Analyze the conflict, call out unreasonable behavior, and provide specific text scripts.

### Input:
User: {user_name}
Partner: {partner_name}

Scenario: {request.scenario}

{user_name}'s Perspective: {request.user_perspective}

{partner_name}'s Perspective: {request.partner_perspective}

### Response:
"""
    
    try:
        # Tokenize
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1536)
        
        # Move to GPU if available
        if torch.cuda.is_available():
            inputs = {k: v.to("cuda") for k, v in inputs.items()}
        
        # Generate
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.7,
                do_sample=True,
                top_p=0.9,
                repetition_penalty=1.1,
                pad_token_id=tokenizer.eos_token_id
            )
        
        # Decode
        full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract response
        if "### Response:" in full_response:
            advice = full_response.split("### Response:")[-1].strip()
        else:
            advice = full_response.strip()
        
        return ConflictResponse(advice=advice)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

if __name__ == "__main__":
    print("Starting Riceee AI API server...")
    print("API will be available at: http://localhost:8000")
    print("Docs at: http://localhost:8000/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
