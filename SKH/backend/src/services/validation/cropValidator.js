const validateCrop = (declaredCrop, aiResult) => {
  const cropNamesMr = {
    soybean: 'सोयाबीन',
    cotton: 'कापूस',
    sugarcane: 'ऊस',
    onion: 'कांदा',
    wheat: 'गहू',
    gram: 'हरभरा',
    maize: 'मका',
    tur: 'तूर',
    bajra: 'बाजरी',
    jowar: 'ज्वारी',
    grapes: 'द्राक्षे',
    pomegranate: 'डाळिंब',
    tomato: 'टोमॅटो'
  };

  const declaredNormalized = declaredCrop ? declaredCrop.trim().toLowerCase() : '';
  const declaredMr = cropNamesMr[declaredNormalized] || declaredCrop || 'सोयाबीन';

  if (!aiResult || aiResult.error || typeof aiResult.detectedCrop !== 'string') {
    return {
      status: 'REVIEW',
      declaredCrop: declaredNormalized,
      detectedCrop: null,
      confidence: 0,
      aiState: 'PENDING',
      reason: aiResult?.message || aiResult?.error || 'AI service unavailable',
      marathiReason: 'AI सर्व्हर व्यस्त असल्यामुळे पीक पडताळणी प्रलंबित आहे. तलाठी/अधिकारी प्रत्यक्ष पडताळणी करतील.'
    };
  }

  const detectedNormalized = aiResult.detectedCrop.trim().toLowerCase();
  const detectedMr = cropNamesMr[detectedNormalized] || aiResult.detectedCrop;

  if (declaredNormalized === detectedNormalized && (aiResult.confidence >= 0.80 || aiResult.confidence === undefined)) {
    return {
      status: 'PASS',
      declaredCrop: declaredNormalized,
      detectedCrop: detectedNormalized,
      detectedItem: detectedMr,
      confidence: aiResult.confidence,
      aiState: 'YES',
      marathiReason: 'पीक जुळले'
    };
  }

  if (declaredNormalized !== detectedNormalized && aiResult.confidence >= 0.90) {
    return {
      status: 'FAIL',
      declaredCrop: declaredNormalized,
      detectedCrop: detectedNormalized,
      detectedItem: detectedMr,
      confidence: aiResult.confidence,
      aiState: 'NO',
      reason: 'Definite crop mismatch',
      marathiReason: `घोषित पीक '${declaredMr}' आहे, परंतु फोटोमध्ये '${detectedMr}' आढळले. तलाठी प्रत्यक्ष पडताळणी करतील.`
    };
  }

  // Not enough confidence or partial match
  return {
    status: 'REVIEW',
    declaredCrop: declaredNormalized,
    detectedCrop: detectedNormalized,
    detectedItem: detectedMr,
    confidence: aiResult.confidence,
    aiState: 'NO',
    reason: 'Insufficient AI confidence',
    marathiReason: `पिकाची १००% खात्री होऊ शकली नाही (अचूकता ${Math.round((aiResult.confidence || 0.5) * 100)}%). तलाठी प्रत्यक्ष पडताळणी करतील.`
  };
};

module.exports = { validateCrop };
