// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const extractInfoBtn = document.getElementById('extractInfoBtn');
    const validateBtn = document.getElementById('validateBtn');
    const statusContainer = document.getElementById('statusContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const merchantInfoContainer = document.getElementById('merchantInfoContainer');
    const merchantEditContainer = document.getElementById('merchantEditContainer');
    
    // Auto-fill the current tab's URL
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0] && tabs[0].url) {
        document.getElementById('paymentGatewayUrl').value = tabs[0].url;
      }
    });
    
    // Extract merchant info button click handler
    extractInfoBtn.addEventListener('click', function() {
      const gatewayUrl = document.getElementById('paymentGatewayUrl').value.trim();
      
      if (!gatewayUrl) {
        showStatus('Please enter a payment gateway URL.', 'warning');
        return;
      }
      
      // Show loading state
      extractInfoBtn.disabled = true;
      loadingIndicator.style.display = 'block';
      statusContainer.style.display = 'none';
      
      // Extract merchant info from URL
      extractMerchantInfo(gatewayUrl);
    });
    
    // Validate merchant button click handler
    validateBtn.addEventListener('click', function() {
      const merchantName = document.getElementById('merchantName').value.trim();
      const merchantId = document.getElementById('merchantId').value.trim();
      
      if (!merchantName) {
        showStatus('Merchant name is required for validation.', 'warning');
        return;
      }
      
      // Show loading state
      validateBtn.disabled = true;
      validateBtn.textContent = 'Validating...';
      loadingIndicator.style.display = 'block';
      statusContainer.style.display = 'none';
      
      // Send message to background script to validate merchant using Tickertape API
      chrome.runtime.sendMessage({
        action: 'validateMerchant',
        merchantName: merchantName,
        merchantId: merchantId,
        url: document.getElementById('paymentGatewayUrl').value.trim()
      }, function(response) {
        validateBtn.disabled = false;
        validateBtn.textContent = 'Validate Merchant';
        loadingIndicator.style.display = 'none';
        
        if (response.error) {
          showStatus(response.error, 'invalid');
        } else if (response.isListed) {
          let detailText = '';
          if (response.details) {
            if (response.details.ticker) {
              detailText = ` (${response.details.ticker})`;
            }
            if (response.details.sector) {
              detailText += ` - ${response.details.sector}`;
            }
          }
          
          showStatus(`✅ Verified: ${merchantName}${detailText} is a listed company on Tickertape.`, 'valid');
          
          // Optionally show more details if available
          if (response.details) {
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'additional-details';
            detailsDiv.style.marginTop = '10px';
            detailsDiv.style.fontSize = '0.9em';
            
            detailsDiv.innerHTML = `
              <strong>Company Details:</strong><br>
              Official Name: ${response.details.name || merchantName}<br>
              ${response.details.ticker ? 'Stock Symbol: ' + response.details.ticker + '<br>' : ''}
              ${response.details.sector ? 'Sector: ' + response.details.sector + '<br>' : ''}
              Last Verified: ${new Date().toLocaleString()}
            `;
            
            statusContainer.appendChild(detailsDiv);
          }
        } else {
          showStatus(`⚠️ Warning: ${merchantName} is not listed on Tickertape. Proceed with payment at your own risk.`, 'warning');
        }
      });
    });
    
    // Function to extract merchant info from URL
    function extractMerchantInfo(url) {
      try {
        const urlObj = new URL(url);
        
        // Get domain name without www. and extension
        let domain = urlObj.hostname.replace('www.', '');
        domain = domain.split('.')[0]; // Get the first part of the domain
        
        // Try to determine merchant name from domain
        const merchantName = domain
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Create a basic merchant ID
        const merchantId = domain.toLowerCase();
        
        // Send message to content script to extract additional info from the page
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs && tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'extractMerchantInfo'
            }, function(response) {
              extractInfoBtn.disabled = false;
              loadingIndicator.style.display = 'none';
              
              let finalMerchantName = merchantName;
              let finalMerchantId = merchantId;
              
              // If content script returned valid info, use it
              if (response && response.merchantName) {
                finalMerchantName = response.merchantName;
              }
              
              if (response && response.merchantId) {
                finalMerchantId = response.merchantId;
              }
              
              // Update the merchant info display
              document.getElementById('extractedMerchantName').textContent = finalMerchantName;
              document.getElementById('extractedMerchantId').textContent = finalMerchantId;
              document.getElementById('extractedWebsite').textContent = urlObj.hostname;
              
              // Show the merchant info and edit containers
              merchantInfoContainer.style.display = 'block';
              merchantEditContainer.style.display = 'block';
              
              // Pre-fill the edit fields
              document.getElementById('merchantName').value = finalMerchantName;
              document.getElementById('merchantId').value = finalMerchantId;
            });
          } else {
            // If unable to communicate with tab, use basic info
            extractInfoBtn.disabled = false;
            loadingIndicator.style.display = 'none';
            
            document.getElementById('extractedMerchantName').textContent = merchantName;
            document.getElementById('extractedMerchantId').textContent = merchantId;
            document.getElementById('extractedWebsite').textContent = urlObj.hostname;
            
            merchantInfoContainer.style.display = 'block';
            merchantEditContainer.style.display = 'block';
            
            document.getElementById('merchantName').value = merchantName;
            document.getElementById('merchantId').value = merchantId;
          }
        });
      } catch (error) {
        extractInfoBtn.disabled = false;
        loadingIndicator.style.display = 'none';
        showStatus('Invalid URL format. Please enter a valid URL.', 'invalid');
      }
    }
    
    // Function to display status messages
    function showStatus(message, type) {
      statusContainer.textContent = message;
      statusContainer.className = 'status ' + type;
      statusContainer.style.display = 'block';
    }
  });