export const listS3Files = async (prefix) => {
    const response = await fetch('/api/s3-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix })
    });
    return await response.json();
  };
  