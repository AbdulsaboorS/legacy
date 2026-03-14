import JoinClient from "./JoinClient";

export default async function JoinPage(props: { params: Promise<{ invite_code: string }> }) {
  const params = await props.params;

  return <JoinClient inviteCode={params.invite_code} />;
}
