"""A stand-in for the Jev API, for trying the playground without an API key.

Serves POST /v1/systemone and GET /v1/models with the same wire format as Jev. The answers are
pseudo-random — stable for the same state and question, so repeated calls agree, with a little
noise when the state carries a `uid` (as consistency sampling does). They look like Jev's
answers; they are not judgments.

    python tools/mock-jev-server.py                # 0.0.0.0:9099
    python tools/mock-jev-server.py --port 9100
"""
import argparse
import hashlib
import json
import random
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MODELS = [
    {'name': 'jev-mock', 'description': 'Mock Jev (tools/mock-jev-server.py)', 'release_date': '2026-01-01'},
]


def rng_for(*parts):
    seed = hashlib.sha256('|'.join(map(str, parts)).encode()).hexdigest()
    return random.Random(int(seed[:16], 16))


def normalise(weights):
    total = sum(weights)
    return [w / total for w in weights]


def answer(name, question, state_key, noise):
    rnd = rng_for(state_key, name)
    jitter = random.Random(noise).uniform(-0.08, 0.08) if noise else 0.0
    kind = question['type']
    if kind == 'noul':
        return {'type': 'noul', 'noul': round(min(1.0, max(0.0, rnd.random() + jitter)), 4)}
    if kind == 'choice':
        labels = list(question['criteria'])
        probs = normalise([rnd.random() ** 3 + 0.01 for _ in labels])
        best = max(range(len(labels)), key=lambda i: probs[i])
        return {
            'type': 'choice',
            'choice': labels[best],
            'probabilities': {label: round(p, 4) for label, p in zip(labels, probs)},
            'confidence': round(max(probs) ** 0.5, 4),
        }
    levels = question['criteria']
    probs = normalise([rnd.random() ** 2 + 0.01 for _ in levels])
    score = min(len(levels) - 1, max(0.0, sum(i * p for i, p in enumerate(probs)) + jitter))
    return {
        'type': 'score',
        'score': round(score, 4),
        'legend': {str(i): level for i, level in enumerate(levels)},
        'probabilities': {str(i): round(p, 4) for i, p in enumerate(probs)},
        'confidence': round(max(probs) ** 0.5, 4),
    }


class Handler(BaseHTTPRequestHandler):

    def _send(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _body(self):
        # The JDK HTTP client sends bodies chunked, without a Content-Length.
        if self.headers['Content-Length']:
            return self.rfile.read(int(self.headers['Content-Length']))
        chunks = b''
        while True:
            size = int(self.rfile.readline().strip(), 16)
            if size == 0:
                self.rfile.readline()
                return chunks
            chunks += self.rfile.read(size)
            self.rfile.readline()

    def do_GET(self):
        if self.path == '/v1/models':
            self._send(200, {'models': MODELS})
        else:
            self._send(404, {'detail': 'Not found'})

    def do_POST(self):
        if self.path != '/v1/systemone':
            self._send(404, {'detail': 'Not found'})
            return
        body = json.loads(self._body())
        state = body.get('state')
        if isinstance(state, (bool, int, float)):
            self._send(422, {'detail': [{'type': 'value_error', 'loc': ['body', 'state'],
                                         'msg': 'state must be a string, object, array or null'}]})
            return
        noise = None
        if isinstance(state, dict) and 'uid' in state:
            noise = state['uid']
            state = {key: value for key, value in state.items() if key != 'uid'}
        state_key = json.dumps(state, sort_keys=True)
        answers = {name: answer(name, question, state_key, noise) for name, question in body['questions'].items()}
        self._send(200, {
            'model': body.get('model') or MODELS[0]['name'],
            'answers': answers,
            'usage': {'input_tokens': 40 + len(state_key) // 4, 'output_tokens': 12 * len(answers)},
        })

    def log_message(self, format, *args):
        print(f'{self.command} {self.path} -> {args[1] if len(args) > 1 else ""}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--host', default='0.0.0.0', help='bind address (default: 0.0.0.0, reachable from Docker)')
    parser.add_argument('--port', type=int, default=9099)
    args = parser.parse_args()
    print(f'Mock Jev listening on http://{args.host}:{args.port}')
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
