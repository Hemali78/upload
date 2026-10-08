import json
import os
import threading
import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(ROOT, "plant_disease_model.keras")
KB_PATH = os.path.join(ROOT, "disease_info.json")

model = tf.keras.models.load_model(MODEL_PATH)
with open(KB_PATH, encoding="utf-8") as f:
    kb = json.load(f)

CLASSES = [
    'Pepper__bell___Bacterial_spot', 'Pepper__bell___healthy',
    'Potato___Early_blight', 'Potato___Late_blight', 'Potato___healthy',
    'Tomato_Bacterial_spot', 'Tomato_Early_blight', 'Tomato_Late_blight',
    'Tomato_Leaf_Mold', 'Tomato_Septoria_leaf_spot',
    'Tomato_Spider_mites_Two_spotted_spider_mite', 'Tomato__Target_Spot',
    'Tomato__Tomato_YellowLeaf__Curl_Virus', 'Tomato__Tomato_mosaic_virus',
    'Tomato_healthy'
]
THRESHOLD = 0.70
FIELDS = ("disease_name", "crop", "symptoms", "cause",
          "general_management", "prevention")
lock = threading.Lock()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024


def looks_like_leaf(img, min_ratio=0.15):
    h = np.array(img.resize((100, 100)).convert("HSV")).astype(int)
    return ((h[..., 0] >= 20) & (h[..., 0] <= 100) &
            (h[..., 1] >= 30)).mean() >= min_ratio


@app.post("/")
def predict():
    f = request.files.get("image")
    if not f:
        return jsonify(status="error", message="No image received"), 400

    try:
        img = Image.open(f.stream).convert("RGB")
    except Exception:
        return jsonify(status="error", message="Could not read this image"), 400

    if not looks_like_leaf(img):
        return jsonify(status="not_leaf")

    x = np.expand_dims(
        np.array(img.resize((224, 224)), dtype="float32"), 0
    )
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)

    with lock:
        p = model.predict(x, verbose=0)[0]

    i = int(p.argmax())
    conf = float(p[i])

    if conf < THRESHOLD:
        return jsonify(status="uncertain", confidence=conf)

    info = kb.get(CLASSES[i], {})
    return jsonify(
        status="prediction",
        confidence=conf,
        **{k: info.get(k) for k in FIELDS}
    )
