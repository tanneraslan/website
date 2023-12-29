import Link from "next/link";

export const MusicItem = (props: any) => {
  return (
    <Link className="!no-underline" href={`/music/${props.id}`}>
      <div className="text-2xl">{props.title}</div>
      <div>{props.id}</div>
    </Link>
  );
};
