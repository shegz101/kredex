import markUrl from '../assets/kredex-logo-mark.svg'

export default function KredexMark({ className = 'h-7 w-7', alt = '' }: { className?: string; alt?: string }) {
  return <img src={markUrl} alt={alt} className={`${className} shrink-0`} />
}
