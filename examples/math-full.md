# Mathematical expressions — LaTeX / KaTeX

A tour of math rendering, mirroring GitHub's [Writing mathematical expressions](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/writing-mathematical-expressions) guide and extending it. Math is powered by **KaTeX** via `remark-math` + `rehype-katex`.

> Delimiters: `$…$` for inline, `$$…$$` for display (block). These are the forms this renderer supports.

---

## 1. Inline expressions

This sentence uses inline math: the Lorentz factor is $\gamma = \frac{1}{\sqrt{1 - v^2/c^2}}$ and it sits in the line.

GitHub's inline example renders here as $\sqrt{3x-1}+(1+x)^2$ right inside the prose.

More inline samples: $a^2 + b^2 = c^2$, $e^{i\pi} + 1 = 0$, $\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}$, and $\lim_{x \to 0} \frac{\sin x}{x} = 1$.

## 2. Display (block) expressions

GitHub's display example — the Cauchy–Schwarz inequality:

$$\left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)$$

The Gaussian integral:

$$\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}$$

Euler's identity, displayed:

$$e^{i\pi} + 1 = 0$$

## 3. Fractions, roots, exponents

$$\frac{n!}{k!(n-k)!} = \binom{n}{k} \qquad \sqrt[3]{x^2 + y^2} \qquad x^{2^{n}}$$

Nested fractions (continued fraction):

$$ \cfrac{1}{1 + \cfrac{1}{2 + \cfrac{1}{3 + \cfrac{1}{4}}}} $$

## 4. Greek letters & symbols

$$\alpha\ \beta\ \gamma\ \delta\ \epsilon\ \varepsilon\ \zeta\ \eta\ \theta\ \vartheta\ \iota\ \kappa\ \lambda\ \mu\ \nu\ \xi\ \pi\ \varpi\ \rho\ \sigma\ \tau\ \upsilon\ \phi\ \varphi\ \chi\ \psi\ \omega$$

$$\Gamma\ \Delta\ \Theta\ \Lambda\ \Xi\ \Pi\ \Sigma\ \Phi\ \Psi\ \Omega \qquad \pm\ \mp\ \times\ \div\ \cdot\ \ast\ \star\ \circ\ \bullet\ \oplus\ \otimes\ \leq\ \geq\ \neq\ \approx\ \equiv\ \cong\ \sim\ \propto\ \infty$$

## 5. Sums, products, integrals, limits

$$\sum_{k=1}^{n} k = \frac{n(n+1)}{2} \qquad \prod_{i=1}^{n} i = n! \qquad \lim_{n \to \infty}\left(1 + \frac{1}{n}\right)^{n} = e$$

$$\iint_D f(x,y)\,dx\,dy \qquad \oint_C \mathbf{F} \cdot d\mathbf{r} \qquad \frac{\partial^2 u}{\partial t^2} = c^2 \nabla^2 u$$

## 6. Matrices

$$ A = \begin{pmatrix} a & b \\ c & d \end{pmatrix} \qquad B = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix} \qquad \det(A) = \begin{vmatrix} a & b \\ c & d \end{vmatrix} = ad - bc $$

## 7. Cases & aligned equations

A piecewise definition:

$$ f(x) = \begin{cases} x^2 & \text{if } x \geq 0 \\ -x  & \text{if } x < 0 \end{cases} $$

Aligned multi-line derivation:

$$
\begin{aligned}
(a+b)^2 &= (a+b)(a+b) \\
        &= a^2 + ab + ba + b^2 \\
        &= a^2 + 2ab + b^2
\end{aligned}
$$

## 8. Accents, vectors, decorations

$$\hat{a}\quad \bar{x}\quad \vec{v}\quad \dot{x}\quad \ddot{x}\quad \tilde{n}\quad \overline{ABC}\quad \underline{xyz}\quad \overrightarrow{AB}\quad \widehat{ABC}$$

## 9. Writing a dollar sign near math (GitHub gotcha)

A literal dollar sign needs care so it isn't read as a math delimiter. To split <span>$</span>100 in half, we calculate $100/2 = 50$ dollars.

Inside a math expression, escape the dollar with a backslash: $\sqrt{\$4} = \$2$.

## 10. GitHub-specific delimiters (fall-back behavior)

GitHub also supports two delimiter forms that this renderer does **not** parse (they are GitHub extensions, not part of `remark-math`). They render literally here — shown so you can see the difference:

- Backtick-dollar inline: `` $`\sqrt{3x-1}+(1+x)^2`$ `` → stays literal.
- Fenced `math` code block:

```math
\left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)
```

> To get the same formula rendered here, use `$$…$$` (Section 2) instead.

---

> **Done.** If Sections 1–9 render as typeset math and Section 10 stays literal, the math pipeline matches expectations. ✅
