// background.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'validateMerchant') {
      validateMerchantWithTickertape(request.merchantName, request.merchantId, request.url)
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          sendResponse({ error: 'Error validating merchant: ' + error.message });
        });
      
      return true; // Indicates we will send a response asynchronously
    }
  });
  
  async function validateMerchantWithTickertape(merchantName, merchantId, url) {
    try {
      // Log validation attempt for debugging
      console.log('Validating merchant:', merchantName, merchantId, url);
      
      // Store the validation attempt
      recordValidationAttempt(merchantName, merchantId, url);
      
      // Format merchant name for API request (lowercase, replace spaces with hyphens)
      const formattedName = merchantName.toLowerCase().replace(/\s+/g, '-');
      
      // Use the correct Tickertape API endpoint as specified
      const apiUrl = `https://api.tickertape.com/stocks/${encodeURIComponent(formattedName)}`;
      
      // Make the API request
      const response = await fetch(apiUrl);
      
      // Check if company exists in Tickertape database
      const isListed = response.ok; // If response is ok (200-299), the merchant is listed
      
      let merchantDetails = null;
      
      if (isListed) {
        // Parse the response data
        const data = await response.json();
        
        merchantDetails = {
          name: data.name || merchantName,
          ticker: data.ticker || '',
          sector: data.sector || '',
          listed: true
        };
      }
      
      // Store the validation result
      const validationResult = {
        isListed: isListed,
        timestamp: Date.now(),
        details: merchantDetails
      };
      
      // Save to local storage for future reference
      chrome.storage.local.set({
        [`merchant_${merchantName.toLowerCase().replace(/\s+/g, '_')}`]: validationResult
      });
      
      return validationResult;
    } catch (error) {
      console.error('Error validating merchant:', error);
      
      // Special handling for 404 errors - indicates merchant not found in Tickertape
      if (error.message.includes('404')) {
        return {
          isListed: false,
          timestamp: Date.now(),
          details: null
        };
      }
      
      return { error: 'Failed to validate merchant. Please try again later.' };
    }
  }
  
  // Function to record validation attempts for analytics
  function recordValidationAttempt(merchantName, merchantId, url) {
    chrome.storage.local.get('validationHistory', function(data) {
      const history = data.validationHistory || [];
      
      history.push({
        merchantName: merchantName,
        merchantId: merchantId,
        url: url,
        timestamp: Date.now()
      });
      
      // Keep only the last 100 validation attempts
      if (history.length > 100) {
        history.shift();
      }
      
      chrome.storage.local.set({ validationHistory: history });
    });
  }