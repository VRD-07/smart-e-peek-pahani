const validateCrop = (declaredCrop, aiResult) => {
  if (!aiResult || aiResult.error || typeof aiResult.detectedCrop !== 'string') {
    return {
      status: 'REVIEW',
      declaredCrop,
      detectedCrop: null,
      confidence: 0,
      reason: aiResult?.message || aiResult?.error || 'AI service unavailable'
    };
  }

  const normalizedDeclared = declaredCrop.trim().toLowerCase();
  const normalizedDetected = aiResult.detectedCrop.trim().toLowerCase();

  if (normalizedDeclared === normalizedDetected && aiResult.confidence >= 0.85) {
    return {
      status: 'PASS',
      declaredCrop: normalizedDeclared,
      detectedCrop: normalizedDetected,
      confidence: aiResult.confidence
    };
  }

  if (normalizedDeclared !== normalizedDetected && aiResult.confidence >= 0.90) {
    return {
      status: 'FAIL',
      declaredCrop: normalizedDeclared,
      detectedCrop: normalizedDetected,
      confidence: aiResult.confidence,
      reason: 'Definite crop mismatch'
    };
  }

  // Not enough confidence or partial match
  return {
    status: 'REVIEW',
    declaredCrop: normalizedDeclared,
    detectedCrop: normalizedDetected,
    confidence: aiResult.confidence,
    reason: 'Insufficient AI confidence'
  };
};

module.exports = { validateCrop };
