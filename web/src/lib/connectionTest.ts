// Connection test utility for debugging Supabase connectivity issues
import { validateSupabaseKey } from './validateSupabase';

export const testSupabaseConnection = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl) {
    return { success: false, error: 'Supabase URL not configured' };
  }

  // First validate the API key
  const keyValidation = validateSupabaseKey();
  if (!keyValidation.valid) {
    return { success: false, error: `API Key Issue: ${keyValidation.error}` };
  }

  try {
    // First test basic URL accessibility
    const healthResponse = await fetch(`${supabaseUrl}/health`, {
      method: 'GET',
      mode: 'cors',
    });

    if (healthResponse.ok) {
      return { success: true, message: 'Supabase connection successful' };
    }

    // If health endpoint fails, try REST API endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { success: true, message: 'Supabase REST API accessible' };
    } else {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown connection error'
    };
  }
};

export const testOAuthProviders = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !anonKey) {
    return { success: false, error: 'Supabase configuration missing' };
  }

  try {
    // Check auth settings endpoint
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const settings = await response.json();
      const enabledProviders = [];
      const disabledProviders = [];
      
      // Check Google
      if (settings.external?.google?.enabled) {
        enabledProviders.push('Google');
      } else {
        disabledProviders.push('Google (check Client ID/Secret)');
      }
      
      // Check GitHub
      if (settings.external?.github?.enabled) {
        enabledProviders.push('GitHub');
      } else {
        disabledProviders.push('GitHub');
      }
      
      let message = '';
      if (enabledProviders.length > 0) {
        message += `✅ Enabled: ${enabledProviders.join(', ')}`;
      }
      if (disabledProviders.length > 0) {
        message += `${enabledProviders.length > 0 ? ' | ' : ''}❌ Disabled: ${disabledProviders.join(', ')}`;
      }
      
      return { 
        success: enabledProviders.length > 0, 
        message: message || 'No OAuth providers configured'
      };
    } else {
      return { 
        success: false, 
        error: `Cannot access auth settings: HTTP ${response.status}` 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error checking providers'
    };
  }
};

export const testAPIKeyValidity = () => {
  const validation = validateSupabaseKey();
  
  if (validation.valid) {
    return {
      success: true,
      message: `✅ API Key valid for project ${validation.projectRef} (role: ${validation.role})`
    };
  } else {
    return {
      success: false,
      error: validation.error
    };
  }
};

export const testNetworkConnectivity = async () => {
  try {
    // Test general internet connectivity
    const response = await fetch('https://api.github.com/zen', {
      method: 'GET',
      mode: 'cors',
    });
    
    return { success: response.ok, message: 'Internet connection verified' };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'No internet connection'
    };
  }
};