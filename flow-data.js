// Gerado por extract_flow.py a partir dos diagramas v4.
const FLOW = [
  {
    "phase": 1,
    "sourceIds": [
      "a1"
    ],
    "formula": "① publish(Γ.bundle, Σ.bundle)\nbundle = ⟨IK^pub, EK^pub, PQE^pub, Sig⟩",
    "routes": [
      {
        "from": 3,
        "to": 2,
        "label": "① publish(Γ.bundle, Σ.bundle)"
      }
    ]
  },
  {
    "phase": 1,
    "sourceIds": [
      "a2",
      "a3",
      "a4",
      "a5"
    ],
    "formula": "② claim(Bob)\n\n② forward()\n\n② ⟨Γ.bundle, Σ.bundle⟩\n\n② ⟨Γ.bundle, Σ.bundle⟩",
    "routes": [
      {
        "from": 0,
        "to": 1,
        "label": "② claim(Bob)"
      },
      {
        "from": 1,
        "to": 2,
        "label": "② forward()"
      },
      {
        "from": 2,
        "to": 1,
        "label": "② ⟨Γ.bundle, Σ.bundle⟩"
      },
      {
        "from": 1,
        "to": 0,
        "label": "② ⟨Γ.bundle, Σ.bundle⟩"
      }
    ]
  },
  {
    "phase": 2,
    "sourceIds": [
      "b3"
    ],
    "formula": "③ verify(Γ.Sig) ∧ verify(Σ.Sig)  →  abort\n   Γ.S ← Γ.DH₁‖Γ.DH₂‖Γ.DH₃‖Γ.ss      (3× ECDH + KEM.Enc)\n   Σ.S ← Σ.DH₁‖Σ.DH₂‖Σ.DH₃‖Σ.ss      (3× ECDH + KEM.Enc)\n   Γ.R₀‖Γ.C₀,₀ ← HKDF(0, Γ.S, \"OLM_ROOT\", 64)\n   Σ.R₀‖Σ.C₀,₀ ← HKDF(0, Σ.S, \"GC_ROOT\", 64)",
    "routes": []
  },
  {
    "phase": 2,
    "sourceIds": [
      "b4"
    ],
    "formula": "④ setup₀ ← msgGX.newSession()\n   Γ.M₀,₀ ← HMAC(Γ.C₀,₀, 0x1)\n   Σ.M₀,₀ ← HMAC(Σ.C₀,₀, 0x3)\n   setup₀* ← AEAD(Σ.M₀,₀, AEAD(Γ.M₀,₀, setup₀))\n",
    "routes": []
  },
  {
    "phase": 2,
    "sourceIds": [
      "a6",
      "a7",
      "a8"
    ],
    "formula": "⑤ send(PreKeyMessage)\n⟨Γ.ct, Σ.ct, Γ.EK^pub_A, Σ.EK^pub_A, setup₀*⟩\n\n⑤ forward()\n\n⑤ deliver(PreKeyMessage)",
    "routes": [
      {
        "from": 0,
        "to": 1,
        "label": "⑤ send(PreKeyMessage)"
      },
      {
        "from": 1,
        "to": 2,
        "label": "⑤ forward()"
      },
      {
        "from": 2,
        "to": 3,
        "label": "⑤ deliver(PreKeyMessage)"
      }
    ]
  },
  {
    "phase": 2,
    "sourceIds": [
      "b6"
    ],
    "formula": "⑥ Γ.ss ← Γ.KEM.Dec(Γ.ct, Γ.PQE^priv_B)\n   Σ.ss ← Σ.KEM.Dec(Σ.ct, Σ.PQE^priv_B)\n   Γ.R₀‖Γ.C₀,₀ ← HKDF(0, Γ.S, \"OLM_ROOT\", 64)\n   Σ.R₀‖Σ.C₀,₀ ← HKDF(0, Σ.S, \"GC_ROOT\", 64)\n   setup₀ ← AEAD⁻¹(Γ.M₀,₀, AEAD⁻¹(Σ.M₀,₀, setup₀*))\n   msgGX.init(setup₀)",
    "routes": []
  },
  {
    "phase": 3,
    "sourceIds": [
      "b7",
      "a9",
      "a10",
      "a11"
    ],
    "formula": "⑦ Γ.ratchet.advance() → Γ.M\n   Σ.ratchet.advance() → Σ.M\n        (dois ratchets, índice compartilhado)\n   evt ← AEAD(Σ.M, AEAD(Γ.M, msg))\n   1 evento para toda a sala, independe de N\n\n⑦ publish(evt)\n\n⑦ forward()\n\n⑦ deliver(evt)\nmsg ← AEAD⁻¹(Γ.M, AEAD⁻¹(Σ.M, evt))",
    "routes": [
      {
        "from": 0,
        "to": 1,
        "label": "⑦ publish(evt)"
      },
      {
        "from": 1,
        "to": 2,
        "label": "⑦ forward()"
      },
      {
        "from": 2,
        "to": 3,
        "label": "⑦ deliver(evt)"
      }
    ]
  },
  {
    "phase": 4,
    "sourceIds": [
      "b8",
      "a12",
      "a13",
      "a14"
    ],
    "formula": "⑧ on(count = R ∨ timeout):\n   Γ.advanceRootKey(·) → Γ.R_i‖Γ.C_i,0\n   Σ.advanceRootKey(·) → Σ.R_i‖Σ.C_i,0\n        ss_i ≠ null ⟺ i = 2^N·n      (senão, só ECDH)\n   setup_i* ← AEAD(Σ.M_i,j, AEAD(Γ.M_i,j, setup_i))\n\n⑧ ∀ m ∈ sala, m ≠ A: send(setup_i*)\nN−1 canais msgX  →  O(N)\n\n⑧ forward()\n\n⑧ deliver(setup_i*)",
    "routes": [
      {
        "from": 0,
        "to": 1,
        "label": "⑧ ∀ m ∈ sala, m ≠ A: send(setup_i*)"
      },
      {
        "from": 1,
        "to": 2,
        "label": "⑧ forward()"
      },
      {
        "from": 2,
        "to": 3,
        "label": "⑧ deliver(setup_i*)"
      }
    ]
  },
  {
    "phase": 4,
    "sourceIds": [
      "b9"
    ],
    "formula": "⑨ Γ.advanceRootKey(·) → Γ.R_i‖Γ.C_i,0\n   Σ.advanceRootKey(·) → Σ.R_i‖Σ.C_i,0\n   setup_i ← AEAD⁻¹(Γ.M_i,j,\n                    AEAD⁻¹(Σ.M_i,j, setup_i*))\n   msgGX.reinit(setup_i)",
    "routes": []
  }
];
