// src/lib/api.js

/**
 * Helper function standard API call menggantikan axios.
 * Secara otomatis menempelkan Authorization Bearer token bila ada.
 */
export async function fetchApi(endpoint, options = {}) {
  // Ambil token dari local storage jika user sudah login
  const token = localStorage.getItem('gk_token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  // Jika response tidak OK, lempar error dengan JSON dari server bila ada
  if (!response.ok) {
    let errorMessage = 'Terjadi kesalahan pada server';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // bukan JSON error
    }
    throw new Error(errorMessage);
  }

  // Jika tidak punya konten tapi ok (misal 204)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
