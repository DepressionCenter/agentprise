<!--
This file is part of Agentprise
CONTRIBUTING.md
Author(s): Gabriel Mongefranco.
Created: 2026-11-05
Last Modified: 2026-11-05
Summary: A short guide for making a first contribution to Agentprise, from
         making a fork to opening a pull request.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Making your first contribution

[Back to project README](README.md)

This guide shows you how to make your first change to Agentprise, one step at
a time. You need a free GitHub account and Git, the program that saves and
shares changes to code. The example is a small one: fixing a typo in the
[frequently asked questions page](docs/faq.md). The same steps work for
most changes.

### Step 1: Make your own copy

You can't change the main project directly, so you work in your own copy.

1. Open the [Agentprise repository](https://github.com/DepressionCenter/agentprise)
   on GitHub. A repository is a project folder that keeps every saved version
   of its files.
2. Choose **Fork**. A fork is your own copy of the repository on GitHub. You
   can change it freely.
3. Download your fork to your computer. This is called cloning, and the
   download is a clone. In your fork, choose the green **Code** button and copy
   the address. Then run this in a terminal, with your GitHub user name in
   place of `YOUR-NAME`:

   ```
   git clone https://github.com/YOUR-NAME/agentprise.git
   cd agentprise
   ```

If you don't have Git yet, get it from [git-scm.com](https://git-scm.com/downloads).

The first time you use Git on a computer, tell it the name and email address
to put on your changes. Anyone can see them on GitHub. To keep your own email
address private, use the no-reply address GitHub gives you. Find it on GitHub
under **Settings**, then **Emails**. Then run these two commands with your own
details:

```
git config --global user.name "Your Name"
git config --global user.email "12345678+YOUR-NAME@users.noreply.github.com"
```

### Step 2: Read the project rules

Two files explain how the project likes things done. Read them before you
change anything:

- [AGENTS.md](AGENTS.md) covers the rules for code, security, privacy,
  accessibility, and writing.
- [SKILLS.md](SKILLS.md) lists short guides for common jobs, such as writing
  documentation.

You don't need to remember every rule. Come back to them when you have a
question.

### Step 3: Make a branch

A branch is a separate place to work on one change. It keeps your change
apart from everything else until it is ready. Give it a short name that says
what the change does:

```
git switch -c fix-faq-typo
```

Now open `docs/faq.md` in any text editor and fix the typo.

### Step 4: Start the app

The app is one web page, so you don't need to build it or make an account.
Start the small web server that comes with the project:

- **Windows:** right-click `run-windows.ps1` and choose **Run with
  PowerShell**.
- **Mac:** open Terminal in the `agentprise` folder and run:

  ```
  bash run-mac.command
  ```

- **Linux:** run this in a terminal, from the `agentprise` folder:

  ```
  bash run-linux.sh
  ```

Your browser opens the app at `http://localhost:8010`. Close the server window
when you are done.

The Library needs this local server to read its files. For everything else,
you can also open `index.html` directly from the folder.

### Step 5: Run the tests

The tests are small programs that check the app still works. They need
Node.js version 22 or later. If you don't have it, get it from
[nodejs.org](https://nodejs.org/).

In a terminal, from the `agentprise` folder, run:

```
npm test
```

At the end, look for `fail 0`. That means every test passed. If a test fails,
read its name and message to see what broke, then fix it and run the tests
again.

If you changed a Library entry under `library/sources/`, the tests fail until
you rebuild it. Run this, then run the tests again:

```
node tools/build-library.mjs
```

### Step 6: Check your change in the browser

Open the app at `http://localhost:8010` again, or reload it if it is still
open. If you changed the app, try the thing you changed and make sure it works.
If you changed a page in `docs`, read it over once more. GitHub shows it with
its formatting after Step 7.

### Step 7: Save your change and ask for a review

Git saves your work as a commit. A commit is a saved set of changes with a
short message that says what changed and why. Save your change and send it to
your fork on GitHub:

```
git add docs/faq.md
git commit -m "Fix a typo in the frequently asked questions"
git push origin fix-faq-typo
```

Next, open a pull request. A pull request asks the maintainers to review your
change and add it to the main project.

1. Open your fork on GitHub.
2. Choose **Compare & pull request**.
3. Say in a few plain sentences what you changed and why.
4. Choose **Create pull request**.

A maintainer reads your change and may ask questions or suggest edits. To
make an edit, change the file, then commit and push again on the same branch.
The pull request updates on its own.

### Start your next change

Your copy still has the branch from your last change, and the main project
may have changed since then. Update your copy before you start again:

1. Open your fork on GitHub and choose **Sync fork**, then **Update branch**.
2. In a terminal, from the `agentprise` folder, run:

   ```
   git switch main
   git pull
   ```

Then start again at Step 3 with a new branch name.

### Conclusion

Those are all the steps: fork, clone, branch, change, test, commit, and pull
request. For your next change, update your copy, then start again at Step 3.

### Additional resources

- [Agentprise repository on GitHub](https://github.com/DepressionCenter/agentprise)
- [Frequently asked questions](docs/faq.md)
- [AGENTS.md, the project rules](AGENTS.md)
- [SKILLS.md, the list of guides for common jobs](SKILLS.md)
- [Git downloads](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/)

[Back to project README](README.md)

----

Copyright © 2026 The Regents of the University of Michigan
