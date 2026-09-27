import { metamaskDappUrl } from "./chain";

export default function MetaMaskLink({ wide = false }: { wide?: boolean }) {
  return (
    <a className={wide ? "solid wide" : "solid"} href={metamaskDappUrl()}>
      MetaMask ile giriş yap
    </a>
  );
}
