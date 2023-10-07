// Simple compression library that works in browser or node with no deps

// ArrayBuffer => ArrayBuffer
export async function compress(s) { 
  const cs = await new Response(s).body.pipeThrough(new CompressionStream('gzip'));
  return await new Response(cs).arrayBuffer()  
}

export async function decompress(gz) {
  const ds = await new Response(gz).body.pipeThrough(new DecompressionStream('gzip'));
  return await new Response(ds).arrayBuffer();
}
