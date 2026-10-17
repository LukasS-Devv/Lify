# Contributing to Spotify Clone

Thank you for your interest in contributing to the Spotify Clone project! We welcome contributions that improve the project, from fixing bugs to adding new features. Please read through this guide to understand how you can contribute effectively.

## Getting Started

1. **Fork the repository**: Click the "Fork" button on the repository page to make a copy in your GitHub account.
2. **Clone your forked repository**: Use the following command to clone the repository locally:

   ```bash
   git clone https://github.com/dhunanyan/spotify-clone.git
   cd spotify-clone
3. Local run:
```bash
  yarn install
  yarn dev

  # for platform specific run
  yarn dev:android # Runs on Adroid device on expo go app or simulator
  yarn dev:ios # Runs on iOS device on expo go app or simulator
```
3.1. For real devices just scan the QR code from terminal on your phone, after you have installed and configured Expo-go.
3.2. For simulators read the menu options on terminal and press the proper button, for corresponding device.

## How to Contribute
### Reporting Bugs
If you find a bug, please create an issue with the following details:

* Description: Provide a clear, concise description of the bug.
* Steps to Reproduce: List the steps to reproduce the issue.
* Expected Behavior: Describe what you expected to happen.
* Screenshots: If applicable, include screenshots to help illustrate the problem.
* Environment: Specify your OS, browser, and any other relevant environment details.

### Suggesting Features
We appreciate new feature ideas! When suggesting a feature, please include:

* Feature Description: A brief description of the feature.
* Use Cases: How this feature could benefit users or improve the project.
* Potential Alternatives: Any alternate solutions you’ve considered.
* Additional Context: Any other relevant context or screenshots.

### Submitting Code Changes
1. Create a new branch: To work on your changes, create a branch with a descriptive name:
```bash
git checkout -b feature/your-feature-name
```
2. Write code: Follow the code style used in the project. Make sure to include comments where necessary.
3. Test your changes: Make sure your code doesn’t introduce new issues by testing it thoroughly. If possible, add tests for new functionality.
4. Commit your changes: Write clear, descriptive commit messages. Please follow Conventional Commits format:
```vbnet
feat: add ability to play/pause songs
fix: resolve issue with playlist rendering
```
5. Push to your fork:
```bash
git push origin feature/your-feature-name
```
6. Open a pull request: Go to the original repository, open a Pull Request (PR), and fill out the PR template. In the PR description, link any related issues.

### Code Style Guidelines
* Naming conventions: Use descriptive names for variables and functions.
* Formatting: Run yarn lint (or npm run lint) to ensure your code follows the project's style guidelines.
* Comments: Comment your code to explain complex logic or important sections.

### Testing
If the project has automated tests, run them using:
```bash
yarn test
```
Please add new tests for any functionality you introduce.

## Code of Conduct
Please review and follow our Code of Conduct in all interactions with the project. Respectful and collaborative behavior is expected from everyone.

## Getting Help
If you need help with your contributions, feel free to open a discussion or contact us at support@example.com.

## Thank You!
Thank you for contributing to the Spotify Clone project! Your involvement helps make this project better for everyone.

---

### Explanation of Each Section:

- **Getting Started**: Helps contributors set up their environment and clone the repository.
- **How to Contribute**: Explains the types of contributions accepted, including reporting bugs and suggesting features.
- **Submitting Code Changes**: Provides steps for creating a branch, writing and testing code, and submitting a pull request.
- **Code Style Guidelines**: Encourages consistency in code style, including naming conventions, formatting, and comments.
- **Testing**: Instructs contributors to test their code and add new tests where applicable.
- **Code of Conduct**: Links to the Code of Conduct, ensuring contributors are aware of expected behavior.
- **Getting Help**: Provides a way for contributors to ask for help if they encounter issues.
- **Thank You!**: Acknowledges the value of contributions, making the process feel welcoming and rewarding.

Customize the links and email addresses as needed, and you’ll have a well-rounded guide to help contributors get involved in your project!
