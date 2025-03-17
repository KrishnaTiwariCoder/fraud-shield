// content.js
// This script runs on web pages and can extract merchant information

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'extractMerchantInfo') {
      const merchantInfo = extractMerchantInfoFromPage();
      sendResponse(merchantInfo);
    }
    return true;
  });
  
  // Function to extract merchant information from the current page
  function extractMerchantInfoFromPage() {
    let merchantName = '';
    let merchantId = '';
    
    // Try different methods to extract merchant name
    
    // Method 1: Check meta tags
    const metaTags = [
      document.querySelector('meta[property="og:site_name"]'),
      document.querySelector('meta[name="author"]'),
      document.querySelector('meta[name="application-name"]')
    ];
    
    for (const tag of metaTags) {
      if (tag && tag.getAttribute('content')) {
        merchantName = tag.getAttribute('content').trim();
        break;
      }
    }
    
    // Method 2: Look for common site name elements
    if (!merchantName) {
      const possibleElements = [
        document.querySelector('title'),
        document.querySelector('h1.logo, div.logo'),
        document.querySelector('header h1, header .site-title'),
        document.querySelector('.merchant-name, .company-name, .brand-name'),
        document.querySelector('.site-name, .store-name')
      ];
      
      for (const element of possibleElements) {
        if (element && element.textContent) {
          merchantName = element.textContent.trim();
          break;
        }
      }
    }
    
    // Method 3: Look for copyright information
    if (!merchantName) {
      const copyrightElements = document.querySelectorAll('.copyright, footer');
      for (const element of copyrightElements) {
        if (element && element.textContent) {
          const copyrightText = element.textContent;
          const copyrightMatch = copyrightText.match(/©\s*\d{4}\s*([A-Za-z0-9\s]+)/);
          if (copyrightMatch && copyrightMatch[1]) {
            merchantName = copyrightMatch[1].trim();
            break;
          }
        }
      }
    }
    
    // Try to extract merchant ID
    // Method 1: Look for merchant ID in page source
    const pageSource = document.documentElement.innerHTML;
    const idPatterns = [
      /merchantId["'\s:=]+([A-Za-z0-9_-]+)/i,
      /merchant_id["'\s:=]+([A-Za-z0-9_-]+)/i,
      /sellerId["'\s:=]+([A-Za-z0-9_-]+)/i,
      /vendor_id["'\s:=]+([A-Za-z0-9_-]+)/i
    ];
    
    for (const pattern of idPatterns) {
      const match = pageSource.match(pattern);
      if (match && match[1]) {
        merchantId = match[1];
        break;
      }
    }
    
    // Method 2: Check for data attributes on elements
    if (!merchantId) {
      const elements = document.querySelectorAll('[data-merchant-id], [data-seller-id], [data-vendor-id]');
      if (elements.length > 0) {
        merchantId = elements[0].getAttribute('data-merchant-id') || 
                     elements[0].getAttribute('data-seller-id') || 
                     elements[0].getAttribute('data-vendor-id');
      }
    }
    
    // Clean up merchant name if found
    if (merchantName) {
      // Remove common suffixes like "| Home" or "- Official Site"
      merchantName = merchantName.replace(/\s*[|\-–—]\s*.*$/, '');
      // Trim and limit length
      merchantName = merchantName.trim().substring(0, 50);
    }
    
    return {
      merchantName: merchantName,
      merchantId: merchantId
    };
  }