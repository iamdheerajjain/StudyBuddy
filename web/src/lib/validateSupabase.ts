// JWT token decoder utility for debugging
export const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

export const validateSupabaseKey = () => {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!anonKey || !url) {
    return { valid: false, error: 'Missing Supabase configuration' };
  }
  
  const decoded = decodeJWT(anonKey);
  if (!decoded) {
    return { valid: false, error: 'Invalid JWT token format' };
  }
  
  // Extract project ref from URL
  const urlMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = urlMatch ? urlMatch[1] : null;
  
  if (!projectRef) {
    return { valid: false, error: 'Invalid Supabase URL format' };
  }
  
  // Check if token is for the correct project
  if (decoded.ref !== projectRef) {
    return { 
      valid: false, 
      error: `API key mismatch: Token is for project "${decoded.ref}" but URL is for project "${projectRef}"` 
    };
  }
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < now) {
    return { valid: false, error: 'API key has expired' };
  }
  
  return { 
    valid: true, 
    projectRef: decoded.ref,
    role: decoded.role,
    expiresAt: new Date(decoded.exp * 1000).toISOString()
  };
};