# Final prompts — built-in image_gen

Reference: the top-left woman in `../mascot-v1/sprite-sheet-original.png`. All requests used `transparent_background: true` and the built-in image generator, without CLI/API fallback. The original outputs are preserved alongside this file.

## Common prefix for reading, celebration and thinking

Edit: identity-preserve. Create ONE new transparent animation pose of the EXACT SAME adult anime chibi woman shown in the TOP LEFT of the reference sprite sheet. Keep the same navy/lavender short bob hair, mint clover hair clip, blue eyes, pastel periwinkle cardigan, white modest blouse, lavender notebook and soft anime cel shading. Waist-up portrait, frontal camera, entire head, both hands and waist visible, centered, at least 12 percent transparent padding on all sides. Same head proportions, outfit, face identity and figure scale. One character only, no multiple panels, no text, no border, no extra objects, genuinely transparent alpha background. This will be an alternate pose blended with the reference in a lightweight personal finance app.

Append the corresponding paragraph to the prefix for each complete prompt:

- **Reading:** New pose: calmly reading the lavender expense notebook, opened in both hands at chest height, eyes looking gently down, small content smile. Warm friendly mood.
- **Celebration:** New pose: cheerful celebration after saving an expense entry. Bright smile, eyes closed with joy, right hand clenched in a small triumphant fist near shoulder, left arm hugging the lavender notebook. Modest cute expression, no confetti.
- **Thinking:** New pose: thoughtful, right index finger lightly touching her chin, blue eyes looking slightly upward, soft curious expression, left arm holds the lavender notebook at chest. Friendly, not worried.

## Puppet kit prompt

Use case: identity-preserve animation asset. Make a 2x2 transparent puppet-part sprite kit of the exact SAME anime chibi woman in the TOP LEFT reference. Same adult female identity, navy short bob with lavender highlights, mint clover hair clip, periwinkle cardigan, white modest blouse, purple notebook. Clean soft anime cel shading. This is an articulated 2D character asset for a finance app, NOT a full character illustration. Exactly four isolated parts, one in each equal cell, no text, no grid lines, no background, alpha transparency and ample padding. Top-left cell: ONLY torso from neck base to waist, cardigan, blouse, left arm and hand hugging the purple notebook. NO head or hair, NO waving right arm. Leave a smooth hidden joint at the right shoulder on viewer's left for attaching an arm. Top-right cell: ONLY head and short neck, same face eyes open smiling, full bob hair and mint clip. No torso, no hands. Bottom-left cell: exact same head and short neck as top-right, same size/alignment/outline/hair, but eyes gently closed in a blink. Bottom-right cell: ONLY her waving right arm from rounded shoulder through cardigan sleeve to raised forearm and open palm, upright hand with five fingers, shoulder lower-right of this part and hand upper-left. No head or torso. Arm has a bent elbow, the same periwinkle sleeve, ready for a shoulder-pivot waving animation. Each part centered in its own cell and entirely separated from other parts. No other anatomy or duplicated whole characters. The parts should reassemble naturally into the original friendly woman with a waving arm and notebook.

## Preparation

Sprite-region extraction, alpha trimming, resizing and PNG palette compression only. The arm region excludes a neighboring head fragment crossing the sprite-cell boundary. No image details were painted or synthesized during file preparation.
