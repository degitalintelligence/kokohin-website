'use client'

import { ReactNode, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface TransitionProps {
  children: ReactNode
  show?: boolean
  appear?: boolean
  enter?: string
  enterFrom?: string
  enterTo?: string
  leave?: string
  leaveFrom?: string
  leaveTo?: string
  className?: string
  duration?: number
  unmount?: boolean
  onExitComplete?: () => void
}

export function Transition({
  children,
  show = true,
  appear = false,
  enter = '',
  enterFrom = '',
  enterTo = '',
  leave = '',
  leaveFrom = '',
  leaveTo = '',
  className,
  duration = 200,
  unmount = true,
  onExitComplete,
}: TransitionProps) {
  const [isShowing, setIsShowing] = useState(appear ? show : false)
  const [isInDOM, setIsInDOM] = useState(!unmount || show)

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout> | undefined
    let t2: ReturnType<typeof setTimeout> | undefined
    if (show) {
      t1 = setTimeout(() => setIsInDOM(true), 0)
      t2 = setTimeout(() => setIsShowing(true), 10)
    } else {
      t2 = setTimeout(() => setIsShowing(false), 0)
    }
    return () => {
      if (t1) clearTimeout(t1)
      if (t2) clearTimeout(t2)
    }
  }, [show, duration, unmount])

  if (!isInDOM) return null

  return (
    <div
      onTransitionEnd={() => {
        if (!show && unmount) {
          setIsInDOM(false)
          if (onExitComplete) onExitComplete()
        }
      }}
      className={cn(
        'transition-all duration-200 ease-in-out',
        isShowing
          ? cn(enter, enterTo)
          : cn(leave, leaveFrom),
        !isShowing && show ? enterFrom : '',
        isShowing && !show ? leaveTo : '',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  )
}

// Predefined transition components
export function FadeIn({
  children,
  show = true,
  duration = 200,
  className,
  unmount = true,
  onExitComplete,
}: Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'>) {
  return (
    <Transition
      show={show}
      appear
      enter="opacity-100"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="opacity-0"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      duration={duration}
      className={className}
      unmount={unmount}
      onExitComplete={onExitComplete}
    >
      {children}
    </Transition>
  )
}

export function SlideUp({
  children,
  show = true,
  duration = 300,
  className,
  unmount = true,
  onExitComplete,
}: Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'>) {
  return (
    <Transition
      show={show}
      appear
      enter="transform opacity-100 translate-y-0"
      enterFrom="transform opacity-0 translate-y-4"
      enterTo="transform opacity-100 translate-y-0"
      leave="transform opacity-0 translate-y-4"
      leaveFrom="transform opacity-100 translate-y-0"
      leaveTo="transform opacity-0 translate-y-4"
      duration={duration}
      className={cn('transition-all', className)}
      unmount={unmount}
      onExitComplete={onExitComplete}
    >
      {children}
    </Transition>
  )
}

export function Scale({
  children,
  show = true,
  duration = 200,
  className,
  unmount = true,
  onExitComplete,
}: Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'>) {
  return (
    <Transition
      show={show}
      appear
      enter="transform opacity-100 scale-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transform opacity-0 scale-95"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
      duration={duration}
      className={cn('transition-all', className)}
      unmount={unmount}
      onExitComplete={onExitComplete}
    >
      {children}
    </Transition>
  )
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <TransitionPreset preset="fade" duration={300}>
      <div className="animate-fade-in-up">
        {children}
      </div>
    </TransitionPreset>
  )
}

type TransitionPresetName = 'fade' | 'slide' | 'scale'

type TransitionPresetProps = Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'> & {
  preset?: TransitionPresetName
}

export function TransitionPreset({
  preset = 'fade',
  ...rest
}: TransitionPresetProps) {
  if (preset === 'fade') {
    return (
      <FadeIn
        show={rest.show}
        duration={rest.duration}
        className={rest.className}
        unmount={rest.unmount}
        onExitComplete={rest.onExitComplete}
      >
        {rest.children}
      </FadeIn>
    )
  }
  if (preset === 'slide') {
    return (
      <SlideUp
        show={rest.show}
        duration={rest.duration}
        className={rest.className}
        unmount={rest.unmount}
        onExitComplete={rest.onExitComplete}
      >
        {rest.children}
      </SlideUp>
    )
  }
  return (
    <Scale
      show={rest.show}
      duration={rest.duration}
      className={rest.className}
      unmount={rest.unmount}
      onExitComplete={rest.onExitComplete}
    >
      {rest.children}
    </Scale>
  )
}
