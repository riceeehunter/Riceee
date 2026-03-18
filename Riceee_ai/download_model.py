"""
Download and save the base Llama 3.2 1B Instruct model locally
Run this once to download the model to H:\riceee\Riceee_ai\base_model\
"""

from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

print("Downloading base Llama 3.2 1B Instruct model...")
print("This will take a few minutes (~2.5GB download)")

model_name = "unsloth/Llama-3.2-1B-Instruct"
save_path = "./base_model"  # Will save to H:\riceee\Riceee_ai\base_model\

# Download tokenizer
print("\n[1/2] Downloading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.save_pretrained(save_path)
print(f"✓ Tokenizer saved to {save_path}")

# Download model
print("\n[2/2] Downloading model...")
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    low_cpu_mem_usage=True
)
model.save_pretrained(save_path)
print(f"✓ Model saved to {save_path}")

print("\n✓ Download complete!")
print(f"Model location: {save_path}")
print("\nYou can now run: python riceee_api.py")
