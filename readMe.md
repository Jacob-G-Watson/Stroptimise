# READ ME

## Local Docker

Without using the GitHub and DockerHub integration the stack can be built with the following. It should produce a similar environment as is intended for production. It makes use of the same .env format as prod.
`docker compose -f .\docker-compose.yml up --build`

## GitHub Workflow and DockerHub hosting

- Commit or make a pull request to main, this will trigger the GutHub workflow
- It will run docker, building the front and backend
- The built images will be tagged uniquely and with latest and pushed to DockerHub
- Target machine
  - A .env file is required or values stored in docker's context, see .env.example
  - docker-compose form ./environments/docker-compose.yml can then be run on the desired environment to pull the newly built images

### NOTE
  
- If attempting to run a single container without using docker-compose env variables will need to be passed to the docker files.

## Building and Pushing Locally with ACT

You can use [nektos/act](https://github.com/nektos/act) to simulate GitHub Actions workflows locally for building and pushing Docker images. This helps verify your CI/CD steps before pushing to GitHub.
Can use```winget install nektos.act``` to install.

To build and push images locally using ACT:

```powershell
cd (git rev-parse --show-toplevel)
act -W .github\workflows\test-built-push.yml
```

To run without tests using ACT:

```powershell
cd (git rev-parse --show-toplevel)
winget install nektos.act
act -W .github\workflows\test-built-push.yml -j build
act -W .github\workflows\test-built-push.yml -j push
```

This will run the `build` and `push` jobs from your workflow, building the images and pushing them to your configured Docker registry. Make sure Docker is running and your `.secret` files are set up as required. Refer to `.secret.example` for an example/

Check `.github/workflows/test-built-push.yml` for job details and configuration.

## Local Dev

### Frontend

```powershell
cd .\frontend\
npm start
```

### Server

On Windows, install deps and run server:

```powershell
cd .\server\
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py -m uvicorn app:app --reload --host 0.0.0.0 --port 9050
```

### Testing frontend

uses jest

```powershell
cd (git rev-parse --show-toplevel)\frontend
npm test
```

### Testing backend

Uses pytest

Check that the dev requirements are installed which includes testing requirements. Then run tests.

```powershell
cd (git rev-parse --show-toplevel)\server
python -m pip install -r requirements.txt -r requirements-dev.txt
pytest
```

### Testing with ACT

```powershell
cd (git rev-parse --show-toplevel)
winget install nektos.act
act -W .github\workflows\test-built-push.yml -j backend-tests
act -W .github\workflows\test-built-push.yml -j frontend-tests
```
