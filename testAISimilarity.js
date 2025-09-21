/**
 * Test AI Similarity - Quick Test
 */

const { spawn } = require('child_process');
const essentialOils = require('./essentialOils.js');

async function testAISimilarity(oil1, oil2) {
  return new Promise((resolve) => {
    const oil1Data = essentialOils[oil1];
    const oil2Data = essentialOils[oil2];

    console.log(`Testing: ${oil1} vs ${oil2}`);

    const bare = spawn('bare', [
      'aiNoteSimilarityBare.js',
      oil1,
      oil2,
      JSON.stringify(oil1Data),
      JSON.stringify(oil2Data)
    ], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    bare.stdout.on('data', (data) => {
      output += data.toString();
    });

    bare.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    bare.on('close', (code) => {
      console.log(`Exit code: ${code}`);
      console.log(`Output: ${output}`);
      if (errorOutput) console.log(`Error: ${errorOutput}`);

      const lines = output.split('\n');
      for (const line of lines) {
        if (line.startsWith('SIMILARITY_RESULT:')) {
          const score = line.replace('SIMILARITY_RESULT:', '');
          console.log(`✅ Similarity: ${score}`);
          resolve(parseFloat(score));
          return;
        }
      }
      resolve(0.5);
    });

    bare.on('error', (error) => {
      console.error('Spawn error:', error);
      resolve(0.5);
    });

    setTimeout(() => {
      if (!bare.killed) {
        bare.kill('SIGTERM');
        console.log('Timeout');
        resolve(0.5);
      }
    }, 180000);
  });
}

async function main() {
  console.log('🧪 Testing AI similarity analysis...');

  // Test with a few oil pairs
  await testAISimilarity('lavender', 'bergamot');
  console.log('---');
  await testAISimilarity('sandalwood', 'cedarwood');
  console.log('---');

  console.log('✅ Test complete');
}

main().catch(console.error);