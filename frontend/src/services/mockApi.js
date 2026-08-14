// Mock API Fallback layer
export const mockSubmitRegistration = async (data) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate validation result
      const isPass = Math.random() > 0.3; // 70% chance to pass
      resolve({
        success: true,
        validationStatus: isPass ? 'PASS' : (Math.random() > 0.5 ? 'FAIL' : 'REVIEW'),
        message: isPass ? 'Validation Passed' : 'Validation Needs Review',
        id: `sub_${Date.now()}`
      });
    }, 1500);
  });
};

export const mockFetchSubmissions = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'sub_1', name: 'Ramesh Patil', crop: 'Soybean', status: 'PASS', date: new Date().toISOString() },
        { id: 'sub_2', name: 'Suresh Deshmukh', crop: 'Cotton', status: 'REVIEW', date: new Date().toISOString() },
      ]);
    }, 1000);
  });
};
